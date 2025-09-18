'use client'
import Link from 'next/link'
import MerchantSwitcher from './MerchantSwitcher'

export default function Nav({ userEmail }: { userEmail: string }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-gray-500">登入帳號</div>
        <div className="font-medium">{userEmail}</div>
      </div>
      <MerchantSwitcher />
      <nav className="space-y-2">
        <Link className="block hover:underline" href="/dashboard">總覽</Link>
        <Link className="block hover:underline" href="/dashboard/ig">IG 貼文同步與勾選</Link>
        <Link className="block hover:underline" href="/dashboard/selections">已勾選清單</Link>
      </nav>
    </div>
  )
}