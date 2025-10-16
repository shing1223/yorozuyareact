// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ---------- utils ----------
function env(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

const ZERO_DECIMAL = new Set(["JPY", "KRW", "TWD"])
function minorToUnit(currency?: string | null, amount?: number | null) {
  if (typeof amount !== "number") return null
  const cur = (currency || "").toUpperCase()
  return ZERO_DECIMAL.has(cur) ? Math.round(amount) : Math.round(amount) / 100
}

function getPiIdFromSession(session: Stripe.Checkout.Session) {
  const v = session.payment_intent
  if (!v) return null
  return typeof v === "string" ? v : v.id
}

// ---------- clients ----------
const stripe = new Stripe(env("STRIPE_SECRET_KEY"))

const supabase = createClient(
  env("NEXT_PUBLIC_SUPABASE_URL"),
  env("SUPABASE_SERVICE_ROLE_KEY"), // server only!
  { auth: { persistSession: false } }
)

// ---------- db helpers ----------
async function updateOrderByCode(order_code: string, patch: Record<string, any>) {
  const { error } = await supabase.from("orders").update(patch).eq("order_code", order_code)
  if (error) throw error
}

// 防止重送導致重覆「改成已付款」
async function safePaidUpdate(order_code: string, patch: Record<string, any>) {
  const { data, error } = await supabase
    .from("orders")
    .select("payment_status")
    .eq("order_code", order_code)
    .maybeSingle()
  if (error) throw error
  if (data?.payment_status === "PAID") return
  await updateOrderByCode(order_code, patch)
}

async function updateMerchantByAccountId(accountId: string, patch: Record<string, any>) {
  const { error } = await supabase
    .from("merchants")
    .update(patch)
    .eq("stripe_account_id", accountId)
  if (error) throw error
}

// 可選：記錄 webhook（若沒有此表會被吃掉，不影響主流程）
async function logEvent(row: { type: string; order_code?: string | null; payload: any }) {
  try {
    await supabase.from("payment_events").insert({
      type: row.type,
      order_code: row.order_code ?? null,
      payload: row.payload,
    })
  } catch {}
}

// ---------- webhook ----------
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 })
  }

  // 先讀原始 body 构建事件
  let event: Stripe.Event
  try {
    const raw = await req.text()
    event = stripe.webhooks.constructEvent(raw, signature, env("STRIPE_WEBHOOK_SECRET"))
  } catch (err: any) {
    return NextResponse.json(
      { error: "signature_verification_failed", detail: err?.message },
      { status: 400 }
    )
  }

  // 嘗試從事件中挖出 order_code（多種容器）
  let order_code: string | null = null
  try {
    const data: any = event.data?.object ?? {}
    order_code =
      data?.metadata?.order_code ??
      data?.object?.metadata?.order_code ??
      data?.subscription_details?.metadata?.order_code ??
      null
  } catch {
    order_code = null
  }

  // 非必要：保存原始事件
  await logEvent({ type: event.type, order_code, payload: event })

  try {
    switch (event.type) {
      // ---------- Stripe Checkout (同步成功回調) ----------
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const code = (session.metadata?.order_code || order_code || "").trim()
        if (!code) break

        await safePaidUpdate(code, {
          payment_method: "STRIPE",
          payment_status: "PAID",
          stripe_session_id: session.id,
          stripe_payment_intent_id: getPiIdFromSession(session),
          amount_total: minorToUnit(session.currency, session.amount_total ?? undefined),
          currency: session.currency?.toUpperCase() ?? null,
          paid_at: new Date().toISOString(),
        })
        break
      }

      // ---------- Stripe Checkout (異步付款成功，如轉帳後補成功) ----------
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session
        const code = (session.metadata?.order_code || order_code || "").trim()
        if (!code) break

        await safePaidUpdate(code, {
          payment_method: "STRIPE",
          payment_status: "PAID",
          stripe_session_id: session.id,
          stripe_payment_intent_id: getPiIdFromSession(session),
          amount_total: minorToUnit(session.currency, session.amount_total ?? undefined),
          currency: session.currency?.toUpperCase() ?? null,
          paid_at: new Date().toISOString(),
        })
        break
      }

      // ---------- Checkout session 過期 ----------
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session
        const code = (session.metadata?.order_code || order_code || "").trim()
        if (!code) break
        await updateOrderByCode(code, { payment_status: "UNPAID" }) // 或 "CANCELED"
        break
      }

      // ---------- 直接用 PaymentIntents 的成功 ----------
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent
        const code =
          (pi.metadata?.order_code as string | undefined) ||
          (pi.metadata?.orderCode as string | undefined)
        if (!code) break

        // 展開 latest_charge 取 chargeId（退款/爭議常用）
        const piFull = await stripe.paymentIntents.retrieve(pi.id, {
          expand: ["latest_charge", "latest_charge.balance_transaction"],
        })
        const latestCharge = typeof piFull.latest_charge === "string" ? null : piFull.latest_charge
        const chargeId = latestCharge?.id ?? null

        await safePaidUpdate(code, {
          payment_method: "STRIPE",
          payment_status: "PAID",
          stripe_payment_intent_id: pi.id,
          stripe_charge_id: chargeId,
          amount_total: minorToUnit(piFull.currency, piFull.amount_received),
          currency: piFull.currency?.toUpperCase() ?? null,
          paid_at: new Date().toISOString(),
        })
        break
      }

      // ---------- 付款失敗 ----------
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent
        const code = (pi.metadata?.order_code || order_code || "").trim()
        if (!code) break
        await updateOrderByCode(code, {
          payment_method: "STRIPE",
          payment_status: "FAILED",
          stripe_payment_intent_id: pi.id,
          failure_code: (pi.last_payment_error as any)?.code ?? null,
          failure_message: (pi.last_payment_error as any)?.message ?? null,
        })
        break
      }

      // ---------- 退款（含部分退款） ----------
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge
        const code = (charge.metadata?.order_code || order_code || "").trim()
        if (!code) break

        const refundedMinor = charge.amount_refunded ?? 0
        const status =
          refundedMinor > 0
            ? refundedMinor >= (charge.amount ?? 0)
              ? "REFUNDED"
              : "PARTIALLY_REFUNDED"
            : "PAID"

        await updateOrderByCode(code, {
          payment_status: status,
          stripe_charge_id: charge.id,
          refund_amount: minorToUnit(charge.currency, refundedMinor),
          currency: charge.currency?.toUpperCase() ?? null,
        })
        break
      }

      // ---------- 爭議 ----------
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute
        const code = (dispute.metadata?.order_code || order_code || "").trim()
        if (!code) break
        await updateOrderByCode(code, { payment_status: "DISPUTED" })
        break
      }

      // ---------- Connect 狀態更新 ----------
      case "account.updated": {
        const acct = event.data.object as Stripe.Account
        await updateMerchantByAccountId(acct.id, {
          stripe_charges_enabled: !!acct.charges_enabled,
          stripe_payouts_enabled: !!acct.payouts_enabled,
          stripe_details_submitted: !!acct.details_submitted,
        })
        break
      }

      // ---------- 商戶撤銷平台授權 ----------
      case "account.application.deauthorized": {
        const accountId = (event.account ?? "") as string
        const application = event.data.object as Stripe.Application | undefined
        if (accountId) {
          await updateMerchantByAccountId(accountId, {
            stripe_charges_enabled: false,
            stripe_payouts_enabled: false,
            stripe_details_submitted: false,
            // 也可選擇清空：stripe_account_id: null,
          })
        }
        await logEvent({
          type: event.type,
          order_code: null,
          payload: { accountId, applicationId: application?.id },
        })
        break
      }

      default:
        // 其餘事件一律 200
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    // 讓 Stripe 重送
    return NextResponse.json(
      { error: "handler_failed", detail: err?.message ?? String(err) },
      { status: 500 }
    )
  }
}