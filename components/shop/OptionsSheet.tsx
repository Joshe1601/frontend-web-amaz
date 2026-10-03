'use client';

import { useEffect, useState } from 'react';
import type { Customization, Product } from '@/lib/shop/types';
import { allRequiredSelected, defaultCustomization, formatPrice, unitPrice } from '@/lib/shop/pricing';
import ProductCustomizer from './ProductCustomizer';

// Hoja inferior para elegir opciones rápidas (p. ej. temperatura de un
// acompañamiento) sin salir de la pantalla. Equivale a OptionsPickerDialog del kiosko.
export default function OptionsSheet({
  product,
  onClose,
  onConfirm,
}: {
  product: Product;
  onClose: () => void;
  onConfirm: (c: Customization) => void;
}) {
  const [custom, setCustom] = useState<Customization>(() => defaultCustomization(product));
  const canAdd = allRequiredSelected(product.options, custom.selectedChoices);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={product.name}>
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-amaz-deeper/50 animate-fade-in" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-amaz-cream-light p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-fade-in sm:rounded-3xl">
        <h2 className="mb-1 font-playfair text-2xl font-bold text-amaz-ink">{product.name}</h2>
        <p className="mb-5 text-sm text-amaz-sub">{formatPrice(unitPrice(product, custom))}</p>
        <ProductCustomizer product={product} customization={custom} onChange={setCustom} />
        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-13 flex-1 rounded-2xl border border-amaz-border bg-white text-[15px] font-semibold text-amaz-sub"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canAdd}
            onClick={() => onConfirm(custom)}
            className="min-h-13 flex-[1.4] rounded-2xl bg-amaz-green text-[15px] font-bold text-amaz-cream disabled:opacity-40"
          >
            Agregar al pedido
          </button>
        </div>
      </div>
    </div>
  );
}
