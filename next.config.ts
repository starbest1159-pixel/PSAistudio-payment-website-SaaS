import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.omise.co' },
      { protocol: 'https', hostname: '**.omise.co' }
    ]
  }
}

export default nextConfig
