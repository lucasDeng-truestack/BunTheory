// Uploaded photos are served by the API, so allow whatever host NEXT_PUBLIC_API_URL points at.
const api = new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001");

// The owner admin now lives in its own app (bakar-roast-admin). Set ADMIN_URL in production
// (e.g. https://admin.bakarandroast.site); defaults to the local admin dev server on 3300.
const adminBase = (process.env.ADMIN_URL || "http://localhost:3300").replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // This app has its own lockfile inside a larger repo; pin the tracing root.
  outputFileTracingRoot: import.meta.dirname,
  // Catering and the home page were merged into "/". Keep old links and bookmarks working.
  // The admin moved out to its own app; forward any /admin link to it (not permanent: the
  // path stays the same, and a cached 308 to a wrong host is hard to undo).
  async redirects() {
    return [
      { source: "/catering", destination: "/", permanent: true },
      // Online catering booking was removed. Old links from emails and bookmarks land on the
      // home page instead of a 404 (not permanent: the booking status page may come back).
      { source: "/catering/book", destination: "/", permanent: false },
      { source: "/booking/:token", destination: "/", permanent: false },
      { source: "/account", destination: "/", permanent: false },
      { source: "/admin", destination: `${adminBase}/admin`, permanent: false },
      { source: "/admin/:path*", destination: `${adminBase}/admin/:path*`, permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      // Owner uploads served by the API (local disk in dev) or object storage.
      { protocol: api.protocol.replace(":", ""), hostname: api.hostname, port: api.port, pathname: "/uploads/**" },
      ...(process.env.NEXT_PUBLIC_IMAGE_HOST
        ? [{ protocol: "https", hostname: process.env.NEXT_PUBLIC_IMAGE_HOST }]
        : []),
    ],
  },
};

export default nextConfig;
