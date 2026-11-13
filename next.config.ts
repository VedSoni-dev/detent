import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // the landing page is a static page built with the taste kit (public/index.html + public/assets); /app is the React app
  async rewrites() { return { beforeFiles: [{ source: "/", destination: "/index.html" }], afterFiles: [], fallback: [] }; },
  turbopack: { root: process.cwd() },
  // lib/publik.ts reads the public publik app token from the repo root at run time; ship it with the server routes.
  outputFileTracingIncludes: { "/api/**": ["./publik-app-token.txt", "./publik-pending.txt"] },
};

export default nextConfig;
