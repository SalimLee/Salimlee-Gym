/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // Optimierungen für Vercel
  poweredByHeader: false,
  async headers() {
    // Medien tragen einen Inhalts-Hash im Namen -> dauerhaft cachebar (B.11.1)
    return [
      {
        source: '/:dir(media|brand)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
  reactStrictMode: true,
}

module.exports = nextConfig
