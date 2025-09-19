// app/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const revalidate = 60; // 首頁快取 60 秒

// SSR Supabase（Next 15：在 Server Component 直接用 cookies()，不要 await）
async function getServerSupabase() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return jar.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            jar.set({ name, value, ...options });
          });
        },
      },
    }
  );
}

export default async function Home() {
  const supabase = await getServerSupabase();

  // 只列出公開商戶
  const { data: merchants, error } = await supabase
    .from("merchants")
    .select("slug, name")
    .eq("is_public", true)
    .order("created_at", { ascending: true });

  // 顯示錯誤（開發時好追蹤；正式可改成靜默）
  if (error) {
    console.error("Load merchants failed:", error.message);
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex gap-3">
        <Link href="/login" className="px-3 py-1 border rounded">
          登入
        </Link>
        <Link href="/dashboard" className="px-3 py-1 border rounded">
          後台
        </Link>
      </div>

      <h1 className="text-3xl font-bold">Instagram 精選平台</h1>
      <p className="text-gray-600">到以下商戶頁面，查看各自公開的 IG 精選貼文牆：</p>

      {!merchants?.length ? (
        <p className="text-gray-500">目前沒有公開商戶。</p>
      ) : (
        <ul className="list-disc pl-6 space-y-2">
          {merchants.map((m) => (
            <li key={m.slug}>
              <Link className="text-blue-600 underline" href={`/shop/${m.slug}`}>
                {m.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}