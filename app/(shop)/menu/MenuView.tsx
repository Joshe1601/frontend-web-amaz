'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProducts } from '@/lib/shop/products';
import { useShop } from '@/lib/shop/cart-store';
import { cartCount, cartSubtotal, formatPrice, isBiscuit } from '@/lib/shop/pricing';
import type { Product } from '@/lib/shop/types';
import ProductCard from '@/components/shop/ProductCard';
import { useQuickAdd } from '@/components/shop/useQuickAdd';
import { ArrowRightIcon } from '@/components/shop/icons';

// Navegación igual que CategoryNavBar del kiosko: tab primario + sub-tabs de bebidas.
// El tab activo vive en la URL (?cat=) para conservarlo al volver del detalle.
const PRIMARY_TABS = [
  { id: 'bebidas', label: 'Bebidas' },
  { id: 'acomp', label: 'Acompañamientos' },
  { id: 'combos', label: 'Combos' },
] as const;

// IDs coinciden con subcategoryId de Firestore.
const DRINK_TABS = [
  { id: 'frappes', label: 'Frappés', sub: 'Bebidas frías, cremosas y llenas de sabor.' },
  { id: 'iced_lattes', label: 'Iced Lattes', sub: 'Espresso sobre leche fría y hielo.' },
  { id: 'hot_coffees', label: 'Hot Coffees', sub: 'Clásicos calientes, preparados al momento.' },
] as const;

const CAT_INFO: Record<string, { title: string; sub: string }> = {
  ...Object.fromEntries(DRINK_TABS.map((t) => [t.id, { title: t.label, sub: t.sub }])),
  acomp: { title: 'Acompañamientos', sub: 'Horneados frescos para acompañar tu café.' },
  combos: { title: 'Combos', sub: 'Bebida + snack a mejor precio.' },
};

function filterProducts(cat: string, all: Product[]) {
  if (cat === 'acomp') return all.filter((p) => p.categoryId === 'acompañamientos');
  if (cat === 'combos') return all.filter((p) => p.categoryId === 'combos');
  const list = all.filter((p) => p.subcategoryId === cat);
  if (cat === 'hot_coffees') {
    list.sort((a, b) => (a.id === 'hot_espresso' ? -1 : b.id === 'hot_espresso' ? 1 : 0));
  }
  return list;
}

export default function MenuView() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('cat') ?? 'frappes';
  const cat = raw in CAT_INFO ? raw : 'frappes';
  const primary = cat === 'acomp' || cat === 'combos' ? cat : 'bebidas';

  const { products, loading, error } = useProducts();
  const { cart } = useShop();
  const { quickAdd, ui } = useQuickAdd();
  const list = filterProducts(cat, products);
  const info = CAT_INFO[cat];

  const selectCat = (next: string) => router.replace(`/menu?cat=${next}`, { scroll: false });

  const onProduct = (p: Product) => {
    if (primary === 'acomp' || isBiscuit(p)) quickAdd(p);
    else router.push(`/menu/${p.id}`);
  };

  const count = cartCount(cart);

  return (
    <div className="pb-32">
      <div className="sticky top-[73px] z-20 border-b border-amaz-border bg-amaz-cream-light">
        <div className="no-scrollbar mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-5 pb-1.5 pt-3">
          {PRIMARY_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectCat(t.id === 'bebidas' ? 'frappes' : t.id)}
              className={`min-h-11 shrink-0 rounded-[14px] px-3 text-sm font-semibold transition-colors sm:px-4.5 sm:text-base ${
                primary === t.id ? 'bg-amaz-green text-amaz-cream' : 'text-[#3A463C]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {primary === 'bebidas' ? (
          <div className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 pb-3 pt-2">
            {DRINK_TABS.map((t) => {
              const on = cat === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectCat(t.id)}
                  className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-[15px] font-semibold transition-colors ${
                    on ? 'border-amaz-green bg-amaz-green text-amaz-cream' : 'border-amaz-border bg-white text-amaz-sub'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${on ? 'bg-amaz-gold' : 'bg-amaz-border'}`} />
                  {t.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="h-2" />
        )}
      </div>

      <div className="mx-auto max-w-6xl px-5">
        <h1 className="mt-6 font-playfair text-[30px] font-bold text-amaz-green">{info.title}</h1>
        <p className="mb-4 mt-1 text-sm text-amaz-sub">{info.sub}</p>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-[18px] bg-amaz-border/60" />
            ))}
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="font-playfair text-2xl text-amaz-muted">Sin conexión</p>
            <p className="mt-2 text-sm text-amaz-muted">{error}</p>
          </div>
        ) : list.length === 0 ? (
          <p className="py-16 text-center font-playfair text-2xl text-amaz-muted">Próximamente</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((p) => (
              <ProductCard key={p.id} product={p} onClick={() => onProduct(p)} />
            ))}
          </div>
        )}
      </div>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <Link
            href="/carrito"
            className="mx-auto flex min-h-14 max-w-md items-center justify-between rounded-2xl bg-amaz-green px-5 py-3 text-amaz-cream shadow-[0_16px_30px_-14px_rgba(27,58,45,0.6)] animate-fade-in"
          >
            <span className="flex items-center gap-3.5">
              <span className="flex h-10 min-w-10 items-center justify-center rounded-[10px] bg-amaz-gold px-1.5 text-[17px] font-bold text-amaz-gold-dark">
                {count}
              </span>
              <span className="text-base font-semibold">Ver mi pedido</span>
            </span>
            <span className="flex items-center gap-2 text-lg font-semibold">
              {formatPrice(cartSubtotal(cart))}
              <ArrowRightIcon size={18} />
            </span>
          </Link>
        </div>
      )}
      {ui}
    </div>
  );
}
