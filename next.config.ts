import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent server-side bundling of canvas (used by qrcode's server entry).
  // AdminPairingClient uses dynamic import so qrcode only loads in the browser,
  // but this ensures no accidental server-side import breaks the build.
  serverExternalPackages: ["canvas"],
};

export default nextConfig;
