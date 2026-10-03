'use client';

import { useState } from 'react';
import type { Product } from '@/lib/shop/types';
import { isBiscuit } from '@/lib/shop/pricing';
import { shopActions } from '@/lib/shop/cart-store';
import OptionsSheet from './OptionsSheet';
import { useToast } from './Toast';

// Agregar acompañamientos sin pasar por el detalle (onAcompTap del kiosko):
// sin opciones o biscuit → directo al carrito; si tiene opciones → hoja de opciones.
export function useQuickAdd() {
  const [sheetProduct, setSheetProduct] = useState<Product | null>(null);
  const { show, toast } = useToast();

  function quickAdd(product: Product) {
    if (product.options.length === 0 || isBiscuit(product)) {
      shopActions.addToCart(product, { selectedSizeId: null, selectedChoices: {}, qty: 1 });
      show(`${product.name} agregado`);
      return;
    }
    setSheetProduct(product);
  }

  const ui = (
    <>
      {toast}
      {sheetProduct && (
        <OptionsSheet
          product={sheetProduct}
          onClose={() => setSheetProduct(null)}
          onConfirm={(c) => {
            // Igual que el kiosko: los acompañamientos van sin tamaño seleccionado.
            shopActions.addToCart(sheetProduct, { ...c, selectedSizeId: null });
            show(`${sheetProduct.name} agregado`);
            setSheetProduct(null);
          }}
        />
      )}
    </>
  );

  return { quickAdd, ui };
}
