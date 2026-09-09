/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/project/:projectId/shifu',
        destination: '/project/:projectId/thread',
      },
      {
        source: '/project/:projectId/shifu/threads',
        destination: '/project/:projectId/threads',
      },
      {
        source: '/project/:projectId/shifu/:threadId',
        destination: '/project/:projectId/thread/:threadId',
      },
      {
        source: '/login/:path*',
        destination: '/auth/:path*',
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/s2/favicons/**',
      },
    ],
  },
  basePath: '',
  // compiler: {
  //   removeConsole: {
  //     exclude: ["error", "warn"],
  //   },
  // },
  output: 'standalone',
};

export default nextConfig;
