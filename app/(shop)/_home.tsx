'use client';

import { useRouter } from 'next/navigation';
import { useProducts } from '@/lib/shop/products';
import { isAcomp } from '@/lib/shop/pricing';
import ProductCard from '@/components/shop/ProductCard';
import ProductImage from '@/components/shop/ProductImage';
import { useQuickAdd } from '@/components/shop/useQuickAdd';
import type { Product } from '@/lib/shop/types';

// Destacados (isFeatured); si no hay, los primeros frappés.
function useFeatured(products: Product[]) {
  const featured = products.filter((p) => p.isFeatured);
  return (featured.length > 0 ? featured : products.filter((p) => p.subcategoryId === 'frappes')).slice(0, 4);
}

export function HeroImage() {
  const { products } = useProducts();
  const hero = useFeatured(products).find((p) => p.categoryId === 'bebidas');

  return (
    <div className="aspect-[4/5] max-h-[560px] min-w-0 flex-[1_1_340px] overflow-hidden rounded-[28px] border border-amaz-gold/25 bg-amaz-deeper">
      {hero ? (
        <ProductImage product={hero} className="h-full w-full" />
      ) : (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-2"
          style={{
            backgroundImage: 'repeating-linear-gradient(135deg, rgba(201,162,75,0.06) 0 14px, transparent 14px 28px)',
          }}
        >
          <span className="font-playfair text-base tracking-[0.3em] text-amaz-gold">AMAZ COFFEE</span>
        </div>
      )}
    </div>
  );
}

export function FeaturedProducts() {
  const { products, loading } = useProducts();
  const router = useRouter();
  const { quickAdd, ui } = useQuickAdd();
  const featured = useFeatured(products);

  if (loading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-[18px] bg-amaz-border/60" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
        {featured.map((p) => (
          <ProductCard key={p.id} product={p} onClick={() => (isAcomp(p) ? quickAdd(p) : router.push(`/menu/${p.id}`))} />
        ))}
      </div>
      {ui}
    </>
  );
}
