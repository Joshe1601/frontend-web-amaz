'use client';

import { useSyncExternalStore } from 'react';
import { MAX_QTY, findMatch } from './pricing';
import type { CartItem, Customization, CustomerInfo, Product, SentOrder } from './types';

// Estado del flujo persistido en localStorage para que no se pierda
// si el cliente sale a WhatsApp o recarga la página.
interface ShopState {
  cart: CartItem[];
  customer: CustomerInfo;
  lastOrder: SentOrder | null;
}

const STORAGE_KEY = 'amaz-shop-v1';

export const EMPTY_CUSTOMER: CustomerInfo = {
  name: '',
  phone: '',
  address: '',
  reference: '',
  paymentMethod: 'yape',
};

const INITIAL: ShopState = { cart: [], customer: EMPTY_CUSTOMER, lastOrder: null };

let state: ShopState = INITIAL;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ShopState>;
      state = {
        cart: Array.isArray(parsed.cart) ? parsed.cart : [],
        customer: { ...EMPTY_CUSTOMER, ...parsed.customer },
        lastOrder: parsed.lastOrder ?? null,
      };
    }
  } catch {
    state = INITIAL;
  }
}

function setState(updater: (s: ShopState) => ShopState) {
  load();
  state = updater(state);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Modo incógnito / cuota llena: el flujo sigue funcionando en memoria.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Sincroniza entre pestañas.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    loaded = false;
    load();
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function getSnapshot() {
  load();
  return state;
}

const getServerSnapshot = () => INITIAL;
const subscribeNoop = () => () => {};

export function useShop() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// false durante SSR/hidratación; true cuando ya se leyó localStorage.
export function useHydrated() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const shopActions = {
  // Agrega al carrito fusionando con un ítem idéntico; si editKey existe,
  // reemplaza ese ítem manteniendo su posición.
  addToCart(product: Product, customization: Customization, editKey?: string | null) {
    // Un pedido nuevo reemplaza la pantalla de "pedido enviado" anterior.
    setState((s) => ({ ...s, lastOrder: null }));
    setState((s) => {
      if (editKey && s.cart.some((i) => i.key === editKey)) {
        const others = s.cart.filter((i) => i.key !== editKey);
        const match = findMatch(others, product.id, customization);
        if (match) {
          // La edición dejó el ítem idéntico a otro: se fusionan.
          const qty = Math.min(MAX_QTY, match.customization.qty + customization.qty);
          return {
            ...s,
            cart: others.map((i) =>
              i.key === match.key ? { ...i, customization: { ...i.customization, qty } } : i,
            ),
          };
        }
        return {
          ...s,
          cart: s.cart.map((i) => (i.key === editKey ? { key: editKey, product, customization } : i)),
        };
      }
      const match = findMatch(s.cart, product.id, customization);
      if (match) {
        const qty = Math.min(MAX_QTY, match.customization.qty + customization.qty);
        return {
          ...s,
          cart: s.cart.map((i) =>
            i.key === match.key ? { ...i, customization: { ...i.customization, qty } } : i,
          ),
        };
      }
      return { ...s, cart: [...s.cart, { key: newKey(), product, customization }] };
    });
  },

  setQty(key: string, qty: number) {
    const clamped = Math.max(1, Math.min(MAX_QTY, qty));
    setState((s) => ({
      ...s,
      cart: s.cart.map((i) => (i.key === key ? { ...i, customization: { ...i.customization, qty: clamped } } : i)),
    }));
  },

  remove(key: string) {
    setState((s) => ({ ...s, cart: s.cart.filter((i) => i.key !== key) }));
  },

  updateCustomer(patch: Partial<CustomerInfo>) {
    setState((s) => ({ ...s, customer: { ...s.customer, ...patch } }));
  },

  // Tras guardar en Firestore: vacía el carrito y recuerda el pedido enviado.
  completeOrder(order: SentOrder) {
    setState((s) => ({ ...s, cart: [], lastOrder: order }));
  },

  clearLastOrder() {
    setState((s) => ({ ...s, lastOrder: null }));
  },
};
