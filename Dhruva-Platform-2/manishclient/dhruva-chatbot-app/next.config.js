/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: false, // Use pages directory
  },
  // Enable static file serving
  trailingSlash: false,
  // Configure for standalone deployment if needed
  output: 'standalone',
}

module.exports = nextConfig
