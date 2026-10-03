'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useShop } from '@/lib/shop/cart-store';
import { cartCount } from '@/lib/shop/pricing';
import { CartIcon } from './icons';

export function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <Image src="/logo-main-amaz.png" alt="" width={36} height={36} className="h-9 w-9 object-contain" priority />
      <span className="font-playfair text-[15px] font-bold leading-[1.1] tracking-[0.38em] text-amaz-green">
        AMAZ
        <br />
        <span className="text-[9px] tracking-[0.5em] text-amaz-muted">COFFEE</span>
      </span>
    </Link>
  );
}

export default function ShopHeader() {
  const { cart } = useShop();
  const pathname = usePathname();
  const count = cartCount(cart);
  const onMenu = pathname.startsWith('/menu');

  return (
    <header className="sticky top-0 z-30 border-b border-amaz-border bg-amaz-cream/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <BrandMark />
        <nav className="flex items-center gap-2.5">
          <Link
            href="/menu"
            className={`flex min-h-12 items-center rounded-xl px-4 text-[15px] font-semibold text-amaz-green ${
              onMenu ? 'bg-amaz-border/60' : ''
            }`}
          >
            Menú
          </Link>
          <Link
            href="/carrito"
            aria-label={`Carrito, ${count} productos`}
            className="relative flex min-h-12 items-center gap-2 rounded-[14px] bg-amaz-green px-4 text-[15px] font-semibold text-amaz-cream"
          >
            <CartIcon size={22} strokeWidth={1.6} />
            <span>{count > 0 ? count : 'Carrito'}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
