/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    domains: ['localhost', 'api.dhruva.ai4bharat.org'],
  },
  basePath: '/dhruva',
  assetPrefix: '/dhruva/',
  async rewrites() {
    return [
      {
        source: '/dhruva/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
      {
        source: '/dhruva/services/:path*',
        destination: 'http://localhost:8000/services/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
