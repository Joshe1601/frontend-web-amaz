'use client';

import Link from 'next/link';
import { shopActions, useHydrated, useShop } from '@/lib/shop/cart-store';
import { useProducts } from '@/lib/shop/products';
import { MAX_QTY, basePrice, cartSubtotal, displaySummary, formatPrice, lineTotal } from '@/lib/shop/pricing';
import type { CartItem } from '@/lib/shop/types';
import ProductImage from '@/components/shop/ProductImage';
import StepHeader from '@/components/shop/StepHeader';
import { QtyStepper } from '@/components/shop/options';
import { useQuickAdd } from '@/components/shop/useQuickAdd';
import { ArrowRightIcon, CartIcon, PlusIcon, TrashIcon } from '@/components/shop/icons';

export default function CartPage() {
  const { cart } = useShop();
  const hydrated = useHydrated();

  if (!hydrated) return <div className="mx-auto h-96 max-w-2xl" />;

  return (
    <div className="mx-auto max-w-2xl px-5 pb-16 pt-6">
      <StepHeader step={1} title="Tu pedido" backHref="/menu" />
      {cart.length === 0 ? <EmptyCart /> : <CartContent cart={cart} />}
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amaz-border/60 text-amaz-muted">
        <CartIcon size={36} strokeWidth={1.4} />
      </span>
      <p className="font-playfair text-2xl text-amaz-green">Tu carrito está vacío</p>
      <p className="mt-2 text-sm text-amaz-sub">Elige tus bebidas favoritas para empezar.</p>
      <Link href="/menu" className="mt-6 inline-flex min-h-13 items-center rounded-2xl bg-amaz-green px-7 font-semibold text-amaz-cream">
        Ver el menú
      </Link>
    </div>
  );
}

function CartContent({ cart }: { cart: CartItem[] }) {
  const subtotal = cartSubtotal(cart);
  return (
    <>
      <ul className="flex flex-col gap-3">
        {cart.map((item) => (
          <CartRow key={item.key} item={item} />
        ))}
      </ul>

      <Link
        href="/menu"
        className="mt-4 flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-dashed border-amaz-border bg-amaz-cream-light text-[15px] font-semibold text-amaz-green"
      >
        Agregar más productos <PlusIcon size={18} strokeWidth={2.2} />
      </Link>

      <Complementos cart={cart} />

      <div className="mt-8 rounded-2xl border border-amaz-border bg-white p-5">
        <div className="flex justify-between text-[15px] text-amaz-sub">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <hr className="my-4 border-amaz-border-light" />
        <div className="flex justify-between text-xl font-bold text-amaz-ink">
          <span>Total</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <Link
          href="/datos"
          className="mt-5 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-amaz-green text-base font-bold text-amaz-cream transition-transform active:scale-[0.98]"
        >
          Continuar con mis datos <ArrowRightIcon size={18} strokeWidth={2.2} />
        </Link>
      </div>
    </>
  );
}

function CartRow({ item }: { item: CartItem }) {
  const opts = displaySummary(item.product, item.customization);
  const editable = item.product.options.length > 0 || item.product.sizes.length > 1;
  return (
    <li className="flex gap-3.5 rounded-2xl border border-amaz-border-light bg-white p-3.5">
      <ProductImage product={item.product} className="h-[84px] w-[84px] shrink-0" rounded="rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-semibold leading-tight text-amaz-ink">{item.product.name}</p>
          <button
            type="button"
            aria-label={`Quitar ${item.product.name}`}
            onClick={() => shopActions.remove(item.key)}
            className="-mr-1.5 -mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-amaz-error/80 hover:bg-amaz-error/5"
          >
            <TrashIcon size={18} />
          </button>
        </div>
        {opts && <p className="mt-0.5 text-[13px] leading-snug text-amaz-sub">{opts}</p>}
        {editable && (
          <Link
            href={`/menu/${item.product.id}?edit=${item.key}`}
            className="mt-1 w-fit text-[13px] font-semibold text-amaz-green underline underline-offset-2"
          >
            Editar
          </Link>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <QtyStepper
            size="sm"
            qty={item.customization.qty}
            max={MAX_QTY}
            onChange={(q) => shopActions.setQty(item.key, q)}
          />
          <span className="text-base font-bold text-amaz-ink">{formatPrice(lineTotal(item))}</span>
        </div>
      </div>
    </li>
  );
}

// Sugerencias de acompañamientos que aún no están en el carrito (_ComplementosSection del kiosko).
function Complementos({ cart }: { cart: CartItem[] }) {
  const { products } = useProducts();
  const { quickAdd, ui } = useQuickAdd();
  const inCart = new Set(cart.map((i) => i.product.id));
  const suggestions = products.filter((p) => p.categoryId === 'acompañamientos' && !inCart.has(p.id));
  if (suggestions.length === 0) return ui;

  return (
    <section className="mt-8">
      <h2 className="font-playfair text-xl font-bold text-amaz-green">¿Algo para acompañar?</h2>
      <div className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-1">
        {suggestions.map((p) => (
          <div key={p.id} className="flex w-[148px] shrink-0 flex-col overflow-hidden rounded-2xl border border-amaz-border-light bg-white">
            <ProductImage product={p} className="aspect-[4/3] w-full" />
            <div className="flex flex-1 flex-col gap-2 p-3">
              <p className="line-clamp-2 text-sm font-semibold leading-tight text-amaz-ink">{p.name}</p>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-[13px] font-semibold text-amaz-sub">{formatPrice(basePrice(p))}</span>
                <button
                  type="button"
                  aria-label={`Agregar ${p.name}`}
                  onClick={() => quickAdd(p)}
                  className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-amaz-green text-amaz-cream"
                >
                  <PlusIcon size={18} strokeWidth={2.2} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {ui}
    </section>
  );
}
