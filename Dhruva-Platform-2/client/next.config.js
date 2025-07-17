/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  basePath: '/dhruva',
  assetPrefix: '/dhruva',
  trailingSlash: true,
  // Add rewrites to handle static assets properly
  async rewrites() {
    return [
      {
        source: '/dhruva/:path*.(svg|png|jpg|jpeg|gif|ico|css|js|woff|woff2|ttf|eot)',
        destination: '/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
