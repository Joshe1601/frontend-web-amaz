'use client';

import type { Product } from '@/lib/shop/types';
import { basePrice, formatPrice, isCombo } from '@/lib/shop/pricing';
import ProductImage from './ProductImage';
import { PlusIcon } from './icons';

// Tarjeta de producto en grilla de 2 columnas (equivalente a ProductCard del kiosko).
export default function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const fromLabel = product.sizes.length > 1 && !isCombo(product) ? 'Desde' : '';
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-[18px] border border-amaz-border-light bg-white text-left shadow-[0_10px_24px_-18px_rgba(27,58,45,0.35)] transition-transform active:scale-[0.98]"
    >
      <div className="aspect-square w-full overflow-hidden bg-white">
        <ProductImage product={product} className="h-full w-full transition-transform group-hover:scale-[1.03]" />
      </div>
      <div className="flex flex-1 flex-col justify-between gap-2 px-3.5 pb-3.5 pt-3">
        <span className="line-clamp-2 text-[15px] font-semibold leading-tight text-amaz-ink">{product.name}</span>
        <span className="flex items-center justify-between gap-2">
          <span className="flex flex-col leading-tight">
            {fromLabel && <span className="text-xs text-amaz-muted">{fromLabel}</span>}
            <span className="whitespace-nowrap text-[15px] font-bold text-amaz-ink">{formatPrice(basePrice(product))}</span>
          </span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-amaz-green text-amaz-cream">
            <PlusIcon size={18} strokeWidth={2.2} />
          </span>
        </span>
      </div>
    </button>
  );
}
