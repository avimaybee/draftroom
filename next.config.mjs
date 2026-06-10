/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8788/api/:path*', // Proxy to Wrangler
      },
    ];
  },
};

export default nextConfig;
