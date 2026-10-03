'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckIcon } from './icons';

// Aviso flotante breve ("Croissant agregado"), como el SnackBar del kiosko.
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(msg);
    timer.current = setTimeout(() => setMessage(null), 2000);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const toast = message ? (
    <div
      role="status"
      className="fixed inset-x-0 top-20 z-50 mx-auto flex w-fit max-w-[90vw] items-center gap-2 rounded-xl bg-amaz-green px-4 py-3 text-[15px] font-semibold text-white shadow-lg animate-fade-in"
    >
      <CheckIcon size={18} strokeWidth={2.4} className="text-amaz-gold" />
      {message}
    </div>
  ) : null;

  return { show, toast };
}
