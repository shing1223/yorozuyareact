// next-pwa.d.ts
declare module "next-pwa" {
  import type { NextConfig } from "next";

  type PWAOptions = {
    dest: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    buildExcludes?: RegExp[];
    sw?: string;
    runtimeCaching?: any[];
  };

  export default function withPWA(
    config: NextConfig & { pwa?: PWAOptions }
  ): NextConfig;
}