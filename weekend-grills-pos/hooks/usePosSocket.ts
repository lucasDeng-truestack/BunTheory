'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { PosOrder } from '@/types/pos';

const WS_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface PosSocketOptions {
  onOrderCreated?: (order: PosOrder) => void;
  onOrderUpdated?: (order: PosOrder) => void;
}

export function usePosSocket(options: PosSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('pos_token')
        : null;

    const socket = io(`${WS_URL}/pos`, {
      auth: token ? { token } : undefined,
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('pos.order.created', (order: PosOrder) => {
      options.onOrderCreated?.(order);
    });

    socket.on('pos.order.updated', (order: PosOrder) => {
      options.onOrderUpdated?.(order);
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
