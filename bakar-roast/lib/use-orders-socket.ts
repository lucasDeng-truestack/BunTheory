"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { Order } from "./bun-theory-api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3101";

/**
 * - `connecting`: first attempt.
 * - `live`: connected, events arriving.
 * - `reconnecting`: the line dropped; socket.io retries on its own.
 * - `refused`: the server turned the session away. socket.io does not retry that, so it needs `retry()`.
 */
export type SocketState = "connecting" | "live" | "reconnecting" | "refused";

type Handlers = {
  onCreated?: (order: Order) => void;
  onUpdated?: (order: Order) => void;
  /** Every successful connect, the first included: refetch so nothing sent while away is missed. */
  onConnect?: () => void;
  /** The server refused the session. Probe it so an expired token still logs out. */
  onRefused?: () => void;
};

/**
 * The `/orders` Socket.io feed for the live board, signed in with the staff session token.
 * Handlers live in refs, so a re-render never tears the socket down; a new token does.
 */
export function useOrdersSocket(token: string, handlers: Handlers) {
  const [state, setState] = useState<SocketState>("connecting");
  const ref = useRef(handlers);
  ref.current = handlers;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;
    setState("connecting");
    const socket = io(`${API_BASE}/orders`, {
      transports: ["websocket", "polling"],
      auth: { token },
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      setState("live");
      ref.current.onConnect?.();
    });
    socket.on("disconnect", () => {
      // A server-side disconnect is not retried by socket.io; treat it like a refusal.
      if (socket.active) setState("reconnecting");
      else {
        setState("refused");
        ref.current.onRefused?.();
      }
    });
    socket.on("connect_error", () => {
      // `active` is false when the server middleware refused (UNAUTHORIZED); true for network errors.
      if (socket.active) setState((s) => (s === "connecting" ? "connecting" : "reconnecting"));
      else {
        setState("refused");
        ref.current.onRefused?.();
      }
    });
    socket.on("order.created", (order: Order) => ref.current.onCreated?.(order));
    socket.on("order.updated", (order: Order) => ref.current.onUpdated?.(order));
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const retry = useCallback(() => {
    const s = socketRef.current;
    if (!s || s.connected) return;
    setState("connecting");
    s.connect();
  }, []);

  return { state, retry };
}
