// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ⚠️ 如果你曾遇到 apiVersion Type 錯誤（例如型別只接受較新的版本字串）
// 建議：省略 apiVersion 參數，直接用套件內建版本即可。
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY! /* , { apiVersion: "2024-06-20" } */)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // 僅在server使用！
  { auth: { persistSession: false } }
)

// 你專案中 orders 建議至少有下列欄位（對應更新）：
// - order_code (unique)  ← 以此尋找訂單
// - payment_method       ← "STRIPE"
// - payment_status       ← "PAID" | "FAILED" | "REFUNDED" | "DISPUTED" | "UNPAID"
// - stripe_session_id
// - stripe_payment_intent_id
// - stripe_charge_id (可選，退款/爭議常用)
// - amount_total         ← 以最終付款的 currency 記「分」或「元」擇一（此例使用「元」）
// - currency
// - paid_at              ← 付款成功時間（timestamp）

// 小工具：更新訂單狀態（以 order_code）
async function updateOrderByCode(order_code: string, patch: Record<string, any>) {
  const { error } = await supabase
    .from("orders")
    .update(patch)
    .eq("order_code", order_code)

  if (error) throw error
}

function centsToUnit(amount: number | null | undefined) {
  if (typeof amount !== "number") return null
  // Stripe amount_total 以「最小幣值單位」(cents) 表示
  return Math.round(amount) / 100
}

// === 添加在檔案上方：輔助函式（用 account_id 更新 merchants 狀態） ===
async function updateMerchantByAccountId(
  accountId: string,
  patch: Record<string, any>
) {
  const { error } = await supabase
    .from("merchants")
    .update(patch)
    .eq("stripe_account_id", accountId)

  if (error) throw error
}

// 也可記錄每次 webhook（可選）
async function logPaymentEvent(row: {
  type: string
  order_code?: string | null
  payload: any
}) {
  try {
    await supabase.from("payment_events").insert({
      type: row.type,
      order_code: row.order_code ?? null,
      payload: row.payload,
    })
  } catch {
    // 若沒有此表或不要記錄，可忽略
  }
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature")
  if (!sig) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const raw = await req.text()
    event = stripe.webhooks.constructEvent(
      raw,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    return NextResponse.json(
      { error: "signature_verification_failed", detail: err?.message },
      { status: 400 }
    )
  }

  // 預先嘗試從不同事件容器裡撈出 order_code（你要確保在建立 session / payment_intent 時寫入 metadata.order_code）
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

  // 可選：記 webhook 事件
  await logPaymentEvent({ type: event.type, order_code, payload: event })

  try {
    switch (event.type) {
      /**
       * ✅ Stripe Checkout 成功付款
       */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        // 建議你在建立 session 時就把 order_code 放入 metadata
        const code = (session.metadata?.order_code || order_code || "").trim()
        if (!code) break

        await updateOrderByCode(code, {
          payment_method: "STRIPE",
          payment_status: "PAID",
          stripe_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent ?? null,
          amount_total: centsToUnit(session.amount_total ?? undefined),
          currency: session.currency?.toUpperCase() ?? null,
          paid_at: new Date().toISOString(),
        })
        break
      }

      // ✅ 連線帳戶狀態更新（完成 KYC、恢復/限制收款與出款等）
case "account.updated": {
  const acct = event.data.object as Stripe.Account

  // 同步到 merchants
  await updateMerchantByAccountId(acct.id, {
    stripe_charges_enabled: !!acct.charges_enabled,
    stripe_payouts_enabled: !!acct.payouts_enabled,
    stripe_details_submitted: !!acct.details_submitted,
  })

  break
}

// ❌ 商戶撤銷了你平台（deauthorize）
case "account.application.deauthorized": {
  // Stripe 會把被撤銷的「商戶帳號」放在 event.account
  const accountId = (event.account ?? "") as string
  // data.object 是 Application 物件（你的平台應用），可拿來記錄但用不到 account
  const application = event.data.object as Stripe.Application | undefined

  if (accountId) {
    await updateMerchantByAccountId(accountId, {
      stripe_charges_enabled: false,
      stripe_payouts_enabled: false,
      stripe_details_submitted: false,
      // 你可選擇清空 account id 或加一個 revoked 欄位做標記
      // stripe_account_id: null,
    })
  }

  // 可選：記錄一下是哪個 application 被撤銷（若你要審計）
  await logPaymentEvent({
    type: event.type,
    order_code: null,
    payload: { accountId, applicationId: application?.id },
  })

  break
}

      /**
       * ✅ 使用 Payment Intents 直接收款成功
       */
      case "payment_intent.succeeded": {
  // 1) 從事件物件拿 PI（Stripe 會把它放在 data.object）
  const pi = event.data.object as Stripe.PaymentIntent;

  // 2) paymentIntentId 直接用 pi.id
  const paymentIntentId = pi.id;

  // 3) 取出你在建立付款時塞進去的訂單編號（請先確保有塞；見下方「建立付款時要做」）
  const code =
    (pi.metadata?.order_code as string | undefined) ||
    (pi.metadata?.orderCode as string | undefined);

  // 若真的沒有 code，可以選擇記 log 或用其他映射表反查
  if (!code) {
    console.warn("[webhook] payment_intent.succeeded 沒有 order_code metadata", {
      paymentIntentId,
      metadata: pi.metadata,
    });
    // 也可以 return 200 提早結束或改為 throw 讓你看到告警
    // return NextResponse.json({ ok: true });
  }

  // 4) 需要 chargeId 的話，用 latest_charge 展開後讀
  const piFull = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge", "latest_charge.balance_transaction"],
  });

  const latestCharge =
    typeof piFull.latest_charge === "string" ? null : piFull.latest_charge;

  const chargeId = latestCharge?.id ?? null;

  // 5) 更新訂單
  await updateOrderByCode(code!, {
    payment_method: "STRIPE",
    payment_status: "PAID",
    stripe_payment_intent_id: paymentIntentId,
    stripe_charge_id: chargeId,
    amount_total: centsToUnit(piFull.amount_received), // 以分為單位 → 轉成元
    currency: piFull.currency?.toUpperCase() ?? null,
    paid_at: new Date().toISOString(),
  });

  break;
}
      /**
       * ❌ 付款失敗
       */
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent
        const code = (pi.metadata?.order_code || order_code || "").trim()
        if (!code) break

        await updateOrderByCode(code, {
          payment_method: "STRIPE",
          payment_status: "FAILED",
          stripe_payment_intent_id: pi.id,
        })
        break
      }

      /**
       * ↩️ 退款
       */
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge
        // 退款事件通常沒有 metadata.order_code，可用你在建立 charge / PI 時寫入的 metadata 或你在 DB 對照
        const code =
          (charge.metadata?.order_code || order_code || "").trim()
        if (!code) break

        await updateOrderByCode(code, {
          payment_status: "REFUNDED",
          stripe_charge_id: charge.id,
        })
        break
      }

      /**
       * ⚠️ 爭議
       */
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute
        const code =
          (dispute.metadata?.order_code || order_code || "").trim()
        if (!code) break

        await updateOrderByCode(code, {
          payment_status: "DISPUTED",
        })
        break
      }

      /**
       * 其他事件：略過但回 200
       */
      default:
        // 可視需要補充更多型別
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    // 任一處理失敗 → 回 500 讓 Stripe 稍後重送
    return NextResponse.json(
      { error: "handler_failed", detail: err?.message },
      { status: 500 }
    )
  }
}