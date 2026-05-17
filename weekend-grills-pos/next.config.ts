import path from "node:path";
import type { NextConfig } from "next";

type RemotePattern = NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
>[number];

/** Backend upload URLs (/uploads/...) so `next/image` can load QR and menu assets in dev/production. */
function uploadRemotePatterns(): RemotePattern[] {
  const dedupe = new Map<string, RemotePattern>();

  function add(protocol: "http" | "https", hostname: string, port?: string) {
    const key = `${protocol}//${hostname}/${port ?? ""}`;
    if (dedupe.has(key)) return;
    const pattern: RemotePattern =
      port && port.length > 0
        ? { protocol, hostname, port, pathname: "/uploads/**" }
        : { protocol, hostname, pathname: "/uploads/**" };
    dedupe.set(key, pattern);
  }

  add("http", "localhost", "3001");
  add("http", "127.0.0.1", "3001");

  const base = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (base) {
    try {
      const u = new URL(base);
      add(
        u.protocol === "https:" ? ("https" as const) : ("http" as const),
        u.hostname,
        u.port || undefined,
      );
    } catch {
      /* ignore */
    }
  }

  return [...dedupe.values()];
}

/** Monorepo: pin Turbopack root. Dev runs with `--webpack` (see package.json): Turbopack on WSL2 often spikes CPU / file watches and can freeze the VM. */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: uploadRemotePatterns(),
  },
  turbopack: {
    root: path.join(__dirname),
  },
  webpack: (config, { dev, isServer }) => {
    // Slow WSL2 / antivirus: heavy route chunks can miss the default window and surface ChunkLoadError.
    if (dev && !isServer && config.output) {
      config.output.chunkLoadTimeout = 300_000;
    }
    return config;
  },
};

export default nextConfig;
