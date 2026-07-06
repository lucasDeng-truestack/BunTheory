"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { Order } from "@/types/order";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Handlers = {
  onCreated?: (order: Order) => void;
  onUpdated?: (order: Order) => void;
};

/**
 * Subscribes to the `/orders` Socket.io namespace for the live admin board.
 * Returns connection status; handlers are kept in refs so re-renders don't
 * tear down the socket.
 */
export function useOrdersSocket({ onCreated, onUpdated }: Handlers) {
  const [connected, setConnected] = useState(false);
  const createdRef = useRef(onCreated);
  const updatedRef = useRef(onUpdated);
  createdRef.current = onCreated;
  updatedRef.current = onUpdated;

  useEffect(() => {
    const socket: Socket = io(`${API_BASE}/orders`, {
      transports: ["websocket", "polling"],
    });
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("order.created", (order: Order) => createdRef.current?.(order));
    socket.on("order.updated", (order: Order) => updatedRef.current?.(order));
    return () => {
      socket.disconnect();
    };
  }, []);

  return { connected };
}
