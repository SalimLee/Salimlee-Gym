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
  reactStrictMode: true,
}

module.exports = nextConfig
