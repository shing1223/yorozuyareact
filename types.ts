// types.ts
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]
export type Database = any // 先用 any；之後可用 Supabase 生成類型覆蓋