/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.maxhse.com', // 網站網址
  generateRobotsTxt: true, // 會自動產生 robots.txt
  sitemapSize: 7000,       // 分割 sitemap.xml 的上限 (通常不用改)
  changefreq: 'daily',     // 預設更新頻率
  priority: 0.7,           // 預設權重
  exclude: [
    '/admin/*',
    '/api/*',
    '/login/*',
    '/dashboard/*',
    '/login?redirect=/*',
  ],
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },  // 允許所有路徑被收錄
    ],
    additionalSitemaps: [
      'https://www.maxhse.com/sitemap.xml', // 主要 sitemap
    ],
  },
}