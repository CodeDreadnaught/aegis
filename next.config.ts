import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    return [
      {
        source: "/equipment/new",
        destination: "/equipment/register",
        permanent: true,
      },
      {
        source: "/equipment/:id((?!register$|new$|view-more$)[^/]+)/edit",
        destination: "/equipment/view-more/:id/edit",
        permanent: true,
      },
      {
        source: "/equipment/:id((?!register$|new$|view-more$)[^/]+)",
        destination: "/equipment/view-more/:id",
        permanent: true,
      },
    ];
  },
  images: {
    qualities: [75, 95],
  },
};

export default nextConfig;
