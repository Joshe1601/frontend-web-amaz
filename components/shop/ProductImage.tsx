'use client';

import { useState } from 'react';
import type { Product } from '@/lib/shop/types';
import { productImageSrc } from '@/lib/shop/pricing';

// Imagen del producto (imageUrl o imagen local del kiosko). Si no hay foto o falla,
// muestra el placeholder verde con el nombre en dorado, como el kiosko.
export default function ProductImage({
  product,
  className = '',
  rounded = '',
  label,
}: {
  product: Product;
  className?: string;
  rounded?: string;
  label?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = productImageSrc(product);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-amaz-deep px-3 text-center ${rounded} ${className}`}
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(201,162,75,0.06) 0 10px, transparent 10px 20px)',
        }}
      >
        <span className="font-playfair text-xs tracking-[0.24em] text-amaz-gold">
          {(label ?? product.name).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- puede ser URL de Firebase Storage; con fallback onError
    <img
      src={src}
      alt={product.name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${rounded} ${className}`}
    />
  );
}
