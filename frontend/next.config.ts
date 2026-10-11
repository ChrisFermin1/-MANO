import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets phones on the same Wi-Fi load the dev server (e.g. http://10.x.x.x:3002)
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*"],
  // The app reaches Josh's backend through its own server: /backend/jobs → http://127.0.0.1:8000/jobs.
  // Works from a phone too (Docker only opens the backend to this Mac), and needs no CORS.
  async rewrites() {
    return [{ source: "/backend/:path*", destination: `${process.env.BACKEND_URL || "http://127.0.0.1:8000"}/:path*` }];
  },
};

export default nextConfig;
