'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useProducts } from '@/lib/shop/products';
import { shopActions, useHydrated, useShop } from '@/lib/shop/cart-store';
import {
  MAX_QTY,
  allRequiredSelected,
  basePrice,
  defaultCustomization,
  formatPrice,
  isCombo,
  unitPrice,
} from '@/lib/shop/pricing';
import type { Customization, Product } from '@/lib/shop/types';
import ProductImage from '@/components/shop/ProductImage';
import ProductCustomizer from '@/components/shop/ProductCustomizer';
import { QtyStepper } from '@/components/shop/options';
import { ArrowLeftIcon } from '@/components/shop/icons';

const backToCategory = (p: Product) =>
  `/menu?cat=${p.categoryId === 'combos' ? 'combos' : p.categoryId === 'acompañamientos' ? 'acomp' : p.subcategoryId || 'frappes'}`;

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const editKey = useSearchParams().get('edit');
  const { products, loading } = useProducts();
  const { cart } = useShop();
  const hydrated = useHydrated();

  const product = products.find((p) => p.id === decodeURIComponent(id));
  const editing = editKey ? cart.find((i) => i.key === editKey) : undefined;

  if (loading || !hydrated) {
    return <div className="h-[300px] animate-pulse bg-amaz-border/50" />;
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <p className="font-playfair text-2xl text-amaz-green">Este producto no está disponible</p>
        <Link href="/menu" className="mt-6 inline-flex min-h-12 items-center rounded-2xl bg-amaz-green px-6 font-semibold text-amaz-cream">
          Ver el menú
        </Link>
      </div>
    );
  }

  return (
    <DetailView
      key={`${product.id}-${editing?.key ?? 'new'}`}
      product={product}
      initial={editing?.customization ?? defaultCustomization(product)}
      editKey={editing?.key ?? null}
    />
  );
}

function DetailView({ product, initial, editKey }: { product: Product; initial: Customization; editKey: string | null }) {
  const router = useRouter();
  const [custom, setCustom] = useState<Customization>(initial);
  const canAdd = allRequiredSelected(product.options, custom.selectedChoices);
  const total = unitPrice(product, custom) * custom.qty;
  const backHref = editKey ? '/carrito' : backToCategory(product);

  const add = () => {
    shopActions.addToCart(product, custom, editKey);
    router.push('/carrito');
  };

  return (
    <div className="mx-auto max-w-6xl pb-36 md:grid md:grid-cols-2 md:gap-10 md:px-5 md:pt-8">
      <div className="relative h-[300px] overflow-hidden bg-white md:sticky md:top-24 md:h-[480px] md:rounded-[28px]">
        <ProductImage product={product} className="h-full w-full" />
        <Link
          href={backHref}
          aria-label="Volver"
          className="absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-amaz-cream/90 text-amaz-green shadow"
        >
          <ArrowLeftIcon size={22} strokeWidth={2.2} />
        </Link>
      </div>

      <div className="px-5 pt-6 md:px-0 md:pt-0">
        <h1 className="font-playfair text-[30px] font-bold leading-tight text-amaz-green">{product.name}</h1>
        {product.description && <p className="mt-2 text-base leading-relaxed text-amaz-sub">{product.description}</p>}
        <p className="mt-2 text-xl font-semibold text-amaz-ink">
          {product.sizes.length > 1 && !isCombo(product) ? 'Desde ' : ''}
          {formatPrice(basePrice(product))}
        </p>
        <hr className="my-6 border-amaz-border" />
        <ProductCustomizer product={product} customization={custom} onChange={setCustom} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-amaz-border bg-amaz-cream-light/95 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <QtyStepper qty={custom.qty} max={MAX_QTY} onChange={(qty) => setCustom({ ...custom, qty })} />
          <button
            type="button"
            disabled={!canAdd}
            onClick={add}
            className="flex min-h-14 min-w-0 flex-1 items-center justify-between gap-2 whitespace-nowrap rounded-2xl bg-amaz-green px-4 text-[15px] font-bold text-amaz-cream transition-transform active:scale-[0.98] disabled:opacity-40 sm:px-5"
          >
            <span>{editKey ? 'Actualizar' : 'Agregar'}</span>
            <span>{formatPrice(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
