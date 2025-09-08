/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // 允许任何 HTTPS 域名
      },
    ],
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;