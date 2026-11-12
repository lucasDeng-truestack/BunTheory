// Uploaded photos are served by the API, so allow whatever host NEXT_PUBLIC_API_URL points at.
const api = new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // This app has its own lockfile inside a larger repo; pin the tracing root.
  outputFileTracingRoot: import.meta.dirname,
  // Catering and the home page were merged into "/". Keep old links and bookmarks working.
  async redirects() {
    return [{ source: "/catering", destination: "/", permanent: true }];
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
