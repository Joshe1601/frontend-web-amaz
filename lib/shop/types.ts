// Modelos del flujo de pedidos web. Replican los modelos del kiosko Flutter
// (frontend_app_amaz_orders/lib/core/models) para mantener la misma lógica.

export interface ProductSize {
  sizeId: string; // "12oz", "16oz", "20oz"
  label: string; // "Pequeño", "Mediano", "Grande"
  price: number;
}

export interface OptionChoice {
  id: string;
  label: string;
  extraPrice: number;
}

// Sección de opciones de un producto: Leche, Crema Batida, Extras, etc.
export interface ProductOption {
  id: string;
  label: string;
  required: boolean;
  multiSelect: boolean;
  choices: OptionChoice[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  categoryId: string; // "bebidas" | "acompañamientos" | "combos"
  subcategoryId: string; // "frappes" | "iced_lattes" | "hot_coffees" | ...
  imageUrl: string;
  isAvailable: boolean;
  isFeatured: boolean;
  sizes: ProductSize[];
  options: ProductOption[];
}

// Selecciones del usuario: tamaño + opciones + cantidad.
// selectedChoices: optionId → [choiceId(s)] (1 para single, N para multi).
export interface Customization {
  selectedSizeId: string | null;
  selectedChoices: Record<string, string[]>;
  qty: number;
}

export interface CartItem {
  key: string;
  product: Product;
  customization: Customization;
}

export type PaymentMethod = 'yape' | 'efectivo';

export interface CustomerInfo {
  name: string;
  zone: string; // id de DELIVERY_ZONES ('' = sin elegir)
  address: string;
  reference: string;
  paymentMethod: PaymentMethod;
}

// Último pedido enviado (para la pantalla de éxito al volver de WhatsApp).
export interface SentOrder {
  number: number;
  total: number;
  waLink: string;
}
