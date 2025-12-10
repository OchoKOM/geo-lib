import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "xsw6wqda0t.ufs.sh",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
