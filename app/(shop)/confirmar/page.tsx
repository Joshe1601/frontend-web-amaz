'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { shopActions, useHydrated, useShop } from '@/lib/shop/cart-store';
import { PAYMENT_LABELS, buildWhatsAppText, saveOrder, whatsAppLink } from '@/lib/shop/orders';
import { cartSubtotal, choiceLabels, displaySizeLabel, formatPrice, lineTotal } from '@/lib/shop/pricing';
import { validateCustomer } from '@/lib/shop/validation';
import { findZone } from '@/lib/shop/delivery';
import type { CartItem, CustomerInfo, SentOrder } from '@/lib/shop/types';
import StepHeader from '@/components/shop/StepHeader';
import { CheckIcon, WhatsAppIcon } from '@/components/shop/icons';

export default function ConfirmarPage() {
  const { cart, customer, lastOrder } = useShop();
  const hydrated = useHydrated();

  if (!hydrated) return <div className="mx-auto h-96 max-w-2xl" />;

  if (cart.length === 0) {
    if (lastOrder) return <OrderSent order={lastOrder} />;
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <p className="font-playfair text-2xl text-amaz-green">Tu carrito está vacío</p>
        <Link href="/menu" className="mt-6 inline-flex min-h-12 items-center rounded-2xl bg-amaz-green px-6 font-semibold text-amaz-cream">
          Ver el menú
        </Link>
      </div>
    );
  }

  if (Object.keys(validateCustomer(customer)).length > 0) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <p className="font-playfair text-2xl text-amaz-green">Faltan tus datos de entrega</p>
        <Link href="/datos" className="mt-6 inline-flex min-h-12 items-center rounded-2xl bg-amaz-green px-6 font-semibold text-amaz-cream">
          Completar mis datos
        </Link>
      </div>
    );
  }

  return <ConfirmView cart={cart} customer={customer} />;
}

function ConfirmView({ cart, customer }: { cart: CartItem[]; customer: CustomerInfo }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subtotal = cartSubtotal(cart);
  const zone = findZone(customer.zone);
  const deliveryFee = zone?.fee ?? 0;
  // Total a pagar por el cliente. En Firestore se guarda solo el subtotal de productos.
  const total = subtotal + deliveryFee;

  // Guarda en Firestore (mismo flujo que el kiosko) y recién entonces abre WhatsApp.
  async function send() {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const { number } = await saveOrder(cart, customer);
      const link = whatsAppLink(buildWhatsAppText(cart, customer, number));
      shopActions.completeOrder({ number, total, waLink: link });
      window.location.assign(link);
    } catch (err) {
      console.error('[Confirmar] Error al guardar pedido:', err);
      setError('No pudimos registrar tu pedido. Revisa tu conexión e inténtalo de nuevo.');
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pb-16 pt-6">
      <StepHeader step={3} title="Confirma tu pedido" backHref="/datos" />

      <section className="rounded-2xl border border-amaz-border bg-white p-5">
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.08em] text-amaz-green">Resumen de tu pedido</h2>
        <ul className="divide-y divide-amaz-border-light">
          {cart.map((item) => {
            const size = displaySizeLabel(item.product, item.customization);
            return (
              <li key={item.key} className="flex justify-between gap-3 py-3 first:pt-0">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-amaz-ink">
                    {item.customization.qty} × {item.product.name}
                    {size && <span className="font-normal text-amaz-sub"> ({size})</span>}
                  </p>
                  {choiceLabels(item.product, item.customization).map((l, i) => (
                    <p key={i} className="text-[13px] text-amaz-sub">
                      + {l}
                    </p>
                  ))}
                </div>
                <span className="shrink-0 text-[15px] font-semibold text-amaz-ink">{formatPrice(lineTotal(item))}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex flex-col gap-1.5 border-t border-amaz-border pt-4 text-[15px] text-amaz-sub">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery{zone && ` (${zone.label})`}</span>
            <span>{formatPrice(deliveryFee)}</span>
          </div>
        </div>
        <div className="mt-3 flex justify-between border-t border-amaz-border-light pt-3 text-xl font-bold text-amaz-ink">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-amaz-border bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-amaz-green">Entrega</h2>
          <Link href="/datos" className="text-[13px] font-semibold text-amaz-green underline underline-offset-2">
            Editar
          </Link>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14px]">
          <dt className="text-amaz-muted">Cliente</dt>
          <dd className="text-amaz-ink">{customer.name}</dd>
          <dt className="text-amaz-muted">Zona</dt>
          <dd className="text-amaz-ink">{zone?.label}</dd>
          <dt className="text-amaz-muted">Dirección</dt>
          <dd className="text-amaz-ink">{customer.address}</dd>
          {customer.reference.trim() && (
            <>
              <dt className="text-amaz-muted">Referencia</dt>
              <dd className="text-amaz-ink">{customer.reference}</dd>
            </>
          )}
          <dt className="text-amaz-muted">Pago</dt>
          <dd className="text-amaz-ink">{PAYMENT_LABELS[customer.paymentMethod]}</dd>
        </dl>
      </section>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-amaz-error/10 px-4 py-3 text-sm font-medium text-amaz-error">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={send}
        disabled={sending}
        className="mt-6 flex min-h-15 w-full items-center justify-center gap-3 rounded-2xl bg-whatsapp text-[17px] font-bold text-white shadow-[0_12px_24px_-12px_rgba(37,211,102,0.7)] transition-transform active:scale-[0.98] disabled:opacity-70"
      >
        {sending ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Registrando pedido…
          </>
        ) : (
          <>
            <WhatsAppIcon size={24} /> Enviar ahora por WhatsApp
          </>
        )}
      </button>
      <p className="mt-3 text-center text-[13px] text-amaz-muted">
        Se abrirá WhatsApp con tu pedido listo. Solo tienes que tocar enviar.
      </p>
    </div>
  );
}

// Pantalla al volver de WhatsApp: el pedido ya quedó registrado.
function OrderSent({ order }: { order: SentOrder }) {
  const router = useRouter();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-16 text-center">
      <span className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-amaz-green text-amaz-gold animate-scale-in">
        <CheckIcon size={40} strokeWidth={2.4} />
      </span>
      <p className="font-mono text-xs tracking-[0.2em] text-amaz-gold-muted">PEDIDO #{order.number}</p>
      <h1 className="mt-2 font-playfair text-[32px] font-bold text-amaz-green">¡Pedido enviado!</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-amaz-sub">
        Total {formatPrice(order.total)}. Te confirmaremos por WhatsApp en unos minutos.
      </p>
      <a
        href={order.waLink}
        className="mt-8 flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-whatsapp text-base font-bold text-white"
      >
        <WhatsAppIcon size={22} /> Abrir WhatsApp de nuevo
      </a>
      <button
        type="button"
        onClick={() => {
          shopActions.clearLastOrder();
          router.push('/menu');
        }}
        className="mt-3 min-h-13 w-full rounded-2xl border border-amaz-border bg-white text-[15px] font-semibold text-amaz-green"
      >
        Hacer otro pedido
      </button>
    </div>
  );
}
