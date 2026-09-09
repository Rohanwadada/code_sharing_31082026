// module.exports = {
//   apps: [
//     {
//       name: "nextjs-app",
//       script: ".next/standalone/server.js",
//       cwd: "/var/frontend",
//       instances: 1,
//       exec_mode: "cluster",
//       env: {
//         NODE_ENV: "production",
//         PORT: 3000,
//       },
//     },
//   ],
// };

module.exports = {
  apps: [
    {
      name: 'nextjs-app',
      script: '.next/standalone/server.js',
      cwd: 'C:/Users/surje/Work/SETU Roadmaps/Phase-1/Demo MVPs/lms enterprise demo_1',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
