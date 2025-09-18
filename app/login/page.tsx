// app/login/page.tsx
import { Suspense } from 'react'
import LoginClient from './LoginClient'

export default function Page({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const redirect = (searchParams?.redirect as string) || '/dashboard'
  return (
    <Suspense>
      <LoginClient redirect={redirect} />
    </Suspense>
  )
}

// 確保不做預先產生，避免 CSR bail-out 警告
export const dynamic = 'force-dynamic'