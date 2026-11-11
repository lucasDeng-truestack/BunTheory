'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { PosOrder } from '@/types/pos';
import { validateAuthSession } from '@/lib/auth-session';
import { useAuthStore } from '@/store/auth.store';

const WS_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101';

interface PosSocketOptions {
  onOrderCreated?: (order: PosOrder) => void;
  onOrderUpdated?: (order: PosOrder) => void;
}

export function usePosSocket(options: PosSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // The feed needs a staff session. Read the token on every (re)connect attempt.
    const socket = io(`${WS_URL}/pos`, {
      auth: (cb) =>
        cb({
          token:
            useAuthStore.getState().token ?? localStorage.getItem('pos_token') ?? '',
        }),
      transports: ['websocket'],
    });

    socketRef.current = socket;

    // Refused, or cut off by the server when the session ended: socket.io will not
    // retry by itself. Check the session (an expired one goes to login), then retry.
    let stopped = false;
    const recover = () => {
      void validateAuthSession().then((ok) => {
        if (ok && !stopped) setTimeout(() => !stopped && socket.connect(), 5000);
      });
    };
    socket.on('connect_error', (err) => {
      if (err.message === 'UNAUTHORIZED') recover();
    });
    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') recover();
    });

    socket.on('pos.order.created', (order: PosOrder) => {
      options.onOrderCreated?.(order);
    });

    socket.on('pos.order.updated', (order: PosOrder) => {
      options.onOrderUpdated?.(order);
    });

    return () => {
      stopped = true;
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
