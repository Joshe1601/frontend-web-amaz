import { doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cartSubtotal, choiceLabels, displaySizeLabel, formatPrice, lineTotal, summary, unitPrice } from './pricing';
import { findZone } from './delivery';
import type { CartItem, CustomerInfo, PaymentMethod } from './types';

export const WHATSAPP_NUMBER = '51922558601';

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  yape: 'Yape / Plin',
  efectivo: 'Efectivo',
};

// Misma lógica que OrderRepository.getNextOrderNumber del kiosko:
// transacción atómica sobre config/settings.orderCounter (contador compartido).
async function getNextOrderNumber(): Promise<number> {
  const configRef = doc(db, 'config', 'settings');
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(configRef);
    const current = snap.data()?.orderCounter;
    const next = (typeof current === 'number' ? current : 0) + 1;
    tx.set(configRef, { orderCounter: next }, { merge: true });
    return next;
  });
}

// Guarda el pedido con el mismo esquema y docId que Order.toFirestore del kiosko.
export async function saveOrder(cart: CartItem[], customer: CustomerInfo): Promise<{ number: number; total: number }> {
  const number = await getNextOrderNumber();
  const d = new Date();
  const docId = `${number}-${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
  const total = cartSubtotal(cart);
  await setDoc(doc(db, 'orders', docId), {
    number,
    customerName: customer.name.trim(),
    deliveryType: 'paraLlevar',
    items: cart.map((i) => ({
      productId: i.product.id,
      productName: i.product.name,
      qty: i.customization.qty,
      unitPrice: unitPrice(i.product, i.customization),
      lineTotal: lineTotal(i),
      options: summary(i.product, i.customization),
    })),
    total,
    createdAt: serverTimestamp(),
    status: 'pending',
    paymentMethod: customer.paymentMethod,
  });
  return { number, total };
}

export function buildWhatsAppText(cart: CartItem[], customer: CustomerInfo, orderNumber: number): string {
  const lines: string[] = [];
  lines.push(`*NUEVO PEDIDO AMAZ COFFEE #${orderNumber}*`, '');
  lines.push(`*Cliente:* ${customer.name.trim()}`, '');
  lines.push('*Pedido:*');
  for (const item of cart) {
    const size = displaySizeLabel(item.product, item.customization);
    lines.push(
      `• ${item.customization.qty} × ${item.product.name}${size ? ` (${size})` : ''} — ${formatPrice(lineTotal(item))}`,
    );
    for (const label of choiceLabels(item.product, item.customization)) lines.push(`   + ${label}`);
  }
  const zone = findZone(customer.zone);
  const subtotal = cartSubtotal(cart);
  lines.push('', `*Subtotal:* ${formatPrice(subtotal)}`);
  if (zone) lines.push(`*Delivery (${zone.label}):* ${formatPrice(zone.fee)}`);
  lines.push(`*Total:* ${formatPrice(subtotal + (zone?.fee ?? 0))}`, '');
  lines.push(`*Zona:* ${zone?.label ?? '—'}`);
  lines.push(`*Dirección:* ${customer.address.trim()}`);
  if (customer.reference.trim()) lines.push(`🗺️ *Referencia:* ${customer.reference.trim()}`);
  lines.push(`*Pago:* ${PAYMENT_LABELS[customer.paymentMethod]}`, '');
  lines.push('¡Hola! Quisiera confirmar mi pedido');
  return lines.join('\n');
}

export const whatsAppLink = (text: string) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
