import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const api = new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3101");

/** The Bun Theory admin now lives in the Bakar & Roast admin. Set in production. */
const adminBase = (process.env.BAKAR_ROAST_URL || "http://localhost:3200").replace(/\/+$/, "");

/** Old storefront admin paths → their new home under /admin/bun-theory. */
const ADMIN_MOVES = [
  ["/admin", "/admin/bun-theory"],
  ["/admin/dashboard", "/admin/bun-theory"],
  ["/admin/login", "/admin/login"],
  ["/admin/board", "/admin/bun-theory/board"],
  ["/admin/batches", "/admin/bun-theory/batches"],
  ["/admin/orders", "/admin/bun-theory/orders"],
  ["/admin/orders/:id", "/admin/bun-theory/orders/:id"],
  ["/admin/payments", "/admin/bun-theory/receipts"],
  ["/admin/menu", "/admin/bun-theory/menu"],
  ["/admin/feedback", "/admin/bun-theory/feedback"],
  ["/admin/settings", "/admin/bun-theory/settings"],
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Monorepo: trace from repo root when both root and frontend lockfiles exist */
  outputFileTracingRoot: path.join(__dirname, ".."),
  async redirects() {
    return [
      ...ADMIN_MOVES.map(([source, to]) => ({
        source,
        destination: `${adminBase}${to}`,
        permanent: false,
      })),
      // Anything else under /admin lands on the Bun Theory overview.
      { source: "/admin/:path*", destination: `${adminBase}/admin/bun-theory`, permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: api.protocol.replace(":", ""),
        hostname: api.hostname,
        port: api.port,
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "**",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
