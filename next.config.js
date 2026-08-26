/** @type {import('next').NextConfig} */
const { securityHeaders } = require('./lib/securityHeaders.cjs')

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

module.exports = nextConfig
