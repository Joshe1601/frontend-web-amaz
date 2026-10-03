'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { OptionChoice, Product, ProductOption, ProductSize } from './types';

type Raw = Record<string, unknown>;

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const num = (v: unknown) => (typeof v === 'number' ? v : 0);
const list = (v: unknown) => (Array.isArray(v) ? (v as Raw[]) : []);

// Equivalente a Product.fromFirestore del kiosko.
function parseProduct(id: string, d: Raw): Product {
  return {
    id,
    name: str(d.name),
    description: str(d.description),
    categoryId: str(d.categoryId),
    subcategoryId: str(d.subcategoryId),
    imageUrl: str(d.imageUrl),
    isAvailable: typeof d.isAvailable === 'boolean' ? d.isAvailable : true,
    isFeatured: d.isFeatured === true,
    sizes: list(d.sizes).map(
      (s): ProductSize => ({ sizeId: str(s.sizeId), label: str(s.label), price: num(s.price) }),
    ),
    options: list(d.options).map(
      (o): ProductOption => ({
        id: str(o.id),
        label: str(o.label),
        required: o.required === true,
        multiSelect: o.multiSelect === true,
        choices: list(o.choices).map(
          (c): OptionChoice => ({ id: str(c.id), label: str(c.label), extraPrice: num(c.extraPrice) }),
        ),
      }),
    ),
  };
}

interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
}

const ProductsContext = createContext<ProductsState>({ products: [], loading: true, error: null });

// Escucha en tiempo real los productos disponibles (isAvailable == true),
// igual que MenuRepository.watchAvailableProducts del kiosko.
export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProductsState>({ products: [], loading: true, error: null });

  useEffect(() => {
    if (!db) {
      console.error('[Products] Firebase no está configurado (revisa .env.local).');
      return;
    }
    return onSnapshot(
      collection(db, 'products'),
      (snap) => {
        const products = snap.docs.map((doc) => parseProduct(doc.id, doc.data())).filter((p) => p.isAvailable);
        setState({ products, loading: false, error: null });
      },
      (err) => {
        console.error('[Products] Error:', err);
        setState((s) => ({ ...s, loading: false, error: 'No pudimos cargar la carta. Revisa tu conexión.' }));
      },
    );
  }, []);

  return <ProductsContext.Provider value={state}>{children}</ProductsContext.Provider>;
}

export const useProducts = () => useContext(ProductsContext);
