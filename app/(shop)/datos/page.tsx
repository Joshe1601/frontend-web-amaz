'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { shopActions, useHydrated, useShop } from '@/lib/shop/cart-store';
import { PAYMENT_LABELS } from '@/lib/shop/orders';
import type { CustomerInfo, PaymentMethod } from '@/lib/shop/types';
import { type CustomerErrors, validateCustomer } from '@/lib/shop/validation';
import { DELIVERY_ZONES } from '@/lib/shop/delivery';
import { formatPrice } from '@/lib/shop/pricing';
import StepHeader from '@/components/shop/StepHeader';
import { ArrowRightIcon, ChevronDownIcon } from '@/components/shop/icons';

type Errors = CustomerErrors;

const PAYMENT_OPTIONS: { id: PaymentMethod; hint: string }[] = [
  { id: 'yape', hint: 'Te enviaremos el número para yapear' },
  { id: 'efectivo', hint: 'Pagas al recibir tu pedido' },
];

export default function DatosPage() {
  const router = useRouter();
  const { cart, customer } = useShop();
  const hydrated = useHydrated();
  const [errors, setErrors] = useState<Errors>({});

  if (!hydrated) return <div className="mx-auto h-96 max-w-2xl" />;

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <p className="font-playfair text-2xl text-amaz-green">Tu carrito está vacío</p>
        <Link href="/menu" className="mt-6 inline-flex min-h-12 items-center rounded-2xl bg-amaz-green px-6 font-semibold text-amaz-cream">
          Ver el menú
        </Link>
      </div>
    );
  }

  const update = (patch: Partial<CustomerInfo>) => {
    shopActions.updateCustomer(patch);
    // Al corregir un campo se limpia su error.
    setErrors((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(patch) as (keyof CustomerInfo)[]) delete next[k];
      return next;
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateCustomer(customer);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(`f-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    router.push('/confirmar');
  };

  return (
    <div className="mx-auto max-w-2xl px-5 pb-16 pt-6">
      <StepHeader step={2} title="Datos de entrega" backHref="/carrito" />
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field id="name" label="Nombre completo" error={errors.name}>
          <input
            id="f-name"
            autoComplete="name"
            value={customer.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Ej. Andrea López"
            className={inputClass(!!errors.name)}
          />
        </Field>
        <Field id="zone" label="Zona de delivery" error={errors.zone}>
          <div className="relative">
            <select
              id="f-zone"
              value={customer.zone}
              onChange={(e) => update({ zone: e.target.value })}
              className={`${inputClass(!!errors.zone)} appearance-none pr-11 ${customer.zone ? '' : 'text-amaz-muted/70'}`}
            >
              <option value="" disabled>
                Elige tu distrito
              </option>
              {DELIVERY_ZONES.map((z) => (
                <option key={z.id} value={z.id} className="text-amaz-ink">
                  {z.label} — {formatPrice(z.fee)}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              size={20}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-amaz-green"
            />
          </div>
        </Field>
        <Field id="address" label="Dirección de entrega" error={errors.address}>
          <input
            id="f-address"
            autoComplete="street-address"
            value={customer.address}
            onChange={(e) => update({ address: e.target.value })}
            placeholder="Ej. Av. La Marina 1234, San Miguel"
            className={inputClass(!!errors.address)}
          />
        </Field>
        <Field id="reference" label="Referencia (opcional)">
          <input
            id="f-reference"
            value={customer.reference}
            onChange={(e) => update({ reference: e.target.value })}
            placeholder="Ej. Frente a Plaza San Miguel"
            className={inputClass(false)}
          />
        </Field>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-amaz-ink">Método de pago preferido</legend>
          <div className="flex flex-col gap-2.5" role="radiogroup">
            {PAYMENT_OPTIONS.map((p) => {
              const on = customer.paymentMethod === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => update({ paymentMethod: p.id })}
                  className={`flex min-h-16 items-center gap-3 rounded-[14px] border-2 px-4 text-left ${
                    on ? 'border-amaz-green bg-[#f3ecd8] text-amaz-green' : 'border-amaz-border bg-[#fdfbf5] text-[#3a463c]'
                  }`}
                >
                  <span className={`h-5 w-5 shrink-0 rounded-full bg-white ${on ? 'border-[6px] border-amaz-green' : 'border-2 border-[#cdbf98]'}`} />
                  <span>
                    <span className="block text-[15px] font-semibold">{PAYMENT_LABELS[p.id]}</span>
                    <span className="block text-[13px] text-amaz-sub">{p.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          type="submit"
          className="mt-2 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-amaz-green text-base font-bold text-amaz-cream transition-transform active:scale-[0.98]"
        >
          Revisar mi pedido <ArrowRightIcon size={18} strokeWidth={2.2} />
        </button>
      </form>
    </div>
  );
}

const inputClass = (error: boolean) =>
  `min-h-13 w-full rounded-[14px] border-2 bg-white px-4 text-base text-amaz-ink outline-none placeholder:text-amaz-muted/70 focus:border-amaz-green ${
    error ? 'border-amaz-error' : 'border-amaz-border'
  }`;

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={`f-${id}`} className="mb-1.5 block text-sm font-semibold text-amaz-ink">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1.5 text-[13px] font-medium text-amaz-error">
          {error}
        </p>
      )}
    </div>
  );
}
