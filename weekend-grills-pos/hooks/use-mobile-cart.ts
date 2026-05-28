'use client';

import { useEffect, useState } from 'react';

/** Below this width, current order uses bottom bar + full-screen drawer. */
export const MOBILE_CART_MAX_WIDTH_PX = 700;

const MOBILE_CART_QUERY = `(max-width: ${MOBILE_CART_MAX_WIDTH_PX}px)`;

export function useMobileCartLayout() {
  const [isMobileCart, setIsMobileCart] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_CART_QUERY);
    const update = () => setIsMobileCart(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isMobileCart;
}
