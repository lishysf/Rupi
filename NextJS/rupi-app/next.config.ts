import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/user/analytics', destination: '/table', permanent: false },
      { source: '/:username/analytics', destination: '/table', permanent: false },
    ];
  },
};

export default nextConfig;
