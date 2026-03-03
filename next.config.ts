import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["canvas"],
  serverActions: {
    bodySizeLimit: "10mb",
  },
};

export default nextConfig;
