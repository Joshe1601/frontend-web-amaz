import type { CartItem, Customization, Product, ProductOption, ProductSize } from './types';

export const MAX_QTY = 9;

export const isCombo = (p: Product) => p.categoryId === 'combos';
export const isAcomp = (p: Product) => p.categoryId === 'acompañamientos';
export const isBiscuit = (p: Product) =>
  p.id.toLowerCase().includes('biscuit') || p.name.toLowerCase().includes('biscuit');

// Imagen del producto: imageUrl (Firebase Storage) si existe; si no, la misma
// imagen local que usa el kiosko (Product.localImagePath) copiada en /public/products.
export function productImageSrc(p: Product): string {
  if (p.imageUrl) return p.imageUrl;
  const folder =
    {
      frappes: 'frappes',
      iced_lattes: 'lattes',
      hot_coffees: 'hot-coffees',
    }[p.subcategoryId] ??
    {
      acompañamientos: 'complements',
      combos: 'combos',
    }[p.categoryId];
  return folder ? `/products/${folder}/${p.id}.jpeg` : '';
}

export const basePrice =(p: Product) => (p.sizes.length > 0 ? p.sizes[0].price : 0);

export const formatPrice = (n: number) => `S/ ${n.toFixed(2)}`;

function findSize(p: Product, sizeId: string | null): ProductSize | undefined {
  if (sizeId == null) return undefined;
  return p.sizes.find((s) => s.sizeId === sizeId);
}

// Precio unitario = precio del tamaño seleccionado + suma de extraPrices elegidos.
export function unitPrice(p: Product, c: Customization): number {
  let price = findSize(p, c.selectedSizeId)?.price ?? basePrice(p);
  for (const option of p.options) {
    for (const choiceId of c.selectedChoices[option.id] ?? []) {
      price += option.choices.find((ch) => ch.id === choiceId)?.extraPrice ?? 0;
    }
  }
  return price;
}

export const lineTotal = (item: CartItem) => unitPrice(item.product, item.customization) * item.customization.qty;

export const cartCount = (cart: CartItem[]) => cart.reduce((acc, i) => acc + i.customization.qty, 0);

export const cartSubtotal = (cart: CartItem[]) => cart.reduce((acc, i) => acc + lineTotal(i), 0);

export const sizeLabel = (p: Product, c: Customization) => findSize(p, c.selectedSizeId)?.label ?? null;

// Para mostrar al cliente: se omite el tamaño cuando el producto tiene uno solo ("Único", "Combo").
export const displaySizeLabel = (p: Product, c: Customization) => (p.sizes.length > 1 ? sizeLabel(p, c) : null);

export function displaySummary(p: Product, c: Customization) {
  const size = displaySizeLabel(p, c);
  return [...(size ? [size] : []), ...choiceLabels(p, c)].join(' · ');
}

// Etiquetas de las opciones elegidas, en el orden de product.options.
export function choiceLabels(p: Product, c: Customization): string[] {
  const labels: string[] = [];
  for (const option of p.options) {
    for (const choiceId of c.selectedChoices[option.id] ?? []) {
      const choice = option.choices.find((ch) => ch.id === choiceId);
      if (choice?.label) labels.push(choice.label);
    }
  }
  return labels;
}

// Igual que optionsSummary del kiosko (se guarda en Firestore): "Mediano · Entera · ...".
export function summary(p: Product, c: Customization) {
  const size = sizeLabel(p, c);
  return [...(size ? [size] : []), ...choiceLabels(p, c)].join(' · ');
}

// Personalización por defecto al abrir un producto:
// "Mediano" si existe (si no, el primer tamaño) y la primera opción
// de cada sección requerida de selección única.
export function defaultCustomization(p: Product): Customization {
  const mediano = p.sizes.find((s) => s.label.toLowerCase() === 'mediano');
  const selectedChoices: Record<string, string[]> = {};
  for (const option of p.options) {
    if (option.required && !option.multiSelect && option.choices.length > 0) {
      selectedChoices[option.id] = [option.choices[0].id];
    }
  }
  return {
    selectedSizeId: (mediano ?? p.sizes[0])?.sizeId ?? null,
    selectedChoices,
    qty: 1,
  };
}

export const allRequiredSelected = (options: ProductOption[], choices: Record<string, string[]>) =>
  options.filter((o) => o.required).every((o) => (choices[o.id] ?? []).length > 0);

// Selecciona/deselecciona una opción. multiSelect → toggle; si no, reemplaza.
export function toggleChoice(
  choices: Record<string, string[]>,
  option: ProductOption,
  choiceId: string,
): Record<string, string[]> {
  const current = choices[option.id] ?? [];
  if (!option.multiSelect) return { ...choices, [option.id]: [choiceId] };
  return {
    ...choices,
    [option.id]: current.includes(choiceId) ? current.filter((id) => id !== choiceId) : [...current, choiceId],
  };
}

function choicesEqual(a: Record<string, string[]>, b: Record<string, string[]>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const av = a[k] ?? [];
    const bv = b[k] ?? [];
    if (av.length !== bv.length || av.some((v, i) => v !== bv[i])) return false;
  }
  return true;
}

// Busca un ítem con el mismo producto y mismas opciones.
export const findMatch = (cart: CartItem[], productId: string, c: Customization) =>
  cart.find(
    (i) =>
      i.product.id === productId &&
      i.customization.selectedSizeId === c.selectedSizeId &&
      choicesEqual(i.customization.selectedChoices, c.selectedChoices),
  );
