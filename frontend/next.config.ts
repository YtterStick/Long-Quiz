import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
];

// Enable static HTML export automatically on Cloudflare Pages / Workers Builds
const isStaticExport =
  process.env.CF_PAGES === "1" ||
  process.env.WORKERS_CI === "1" ||
  process.env.STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        output: "export",
        images: {
          unoptimized: true,
        },
      }
    : {
        async headers() {
          return [
            {
              source: "/:path*",
              headers: securityHeaders,
            },
          ];
        },
      }),
};

export default nextConfig;
