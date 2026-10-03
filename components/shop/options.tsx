'use client';

import { useState } from 'react';
import type { ProductOption, ProductSize } from '@/lib/shop/types';
import { formatPrice } from '@/lib/shop/pricing';
import { CheckIcon, ChevronDownIcon, MinusIcon, PlusIcon } from './icons';

export function RequiredBadge({ required }: { required: boolean }) {
  return (
    <span
      className={`rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${
        required
          ? 'border-amaz-green/20 bg-amaz-green/[0.07] text-amaz-green'
          : 'border-amaz-border bg-amaz-border/70 text-amaz-sub'
      }`}
    >
      {required ? 'Requerido' : 'Opcional'}
    </span>
  );
}

function SectionTitle({ title, required }: { title: string; required: boolean }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-amaz-green">{title}</h3>
      <RequiredBadge required={required} />
    </div>
  );
}

// Chip de selección única (tamaño, leche, crema…). Equivale a OptionButton del kiosko.
function ChipButton({
  label,
  sublabel,
  selected,
  onClick,
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-16 min-w-[96px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[14px] border-2 px-3 py-2 text-center transition-colors ${
        selected ? 'border-amaz-green bg-amaz-green text-amaz-cream' : 'border-amaz-border bg-white text-amaz-ink'
      }`}
    >
      <span className="text-[15px] font-semibold leading-tight">{label}</span>
      {sublabel && (
        <span className={`text-xs ${selected ? 'text-amaz-cream/75' : 'text-amaz-muted'}`}>{sublabel}</span>
      )}
    </button>
  );
}

export function SizesSection({
  sizes,
  selectedSizeId,
  onSelect,
}: {
  sizes: ProductSize[];
  selectedSizeId: string | null;
  onSelect: (sizeId: string) => void;
}) {
  return (
    <section className="mb-7">
      <SectionTitle title="Tamaño" required />
      <div className="flex flex-wrap gap-2.5">
        {sizes.map((s) => (
          <ChipButton
            key={s.sizeId}
            label={s.label}
            sublabel={formatPrice(s.price)}
            selected={selectedSizeId === s.sizeId}
            onClick={() => onSelect(s.sizeId)}
          />
        ))}
      </div>
    </section>
  );
}

// Sección de selección única: chips en fila (bebidas y acompañamientos).
export function SingleOptionSection({
  option,
  selected,
  onSelect,
}: {
  option: ProductOption;
  selected: string[];
  onSelect: (choiceId: string) => void;
}) {
  return (
    <section className="mb-7">
      <SectionTitle title={option.label} required={option.required} />
      <div className="flex flex-wrap gap-2.5">
        {option.choices.map((c) => (
          <ChipButton
            key={c.id}
            label={c.label}
            sublabel={c.extraPrice > 0 ? `+ ${formatPrice(c.extraPrice)}` : undefined}
            selected={selected.includes(c.id)}
            onClick={() => onSelect(c.id)}
          />
        ))}
      </div>
    </section>
  );
}

// Sección multiselección: lista con checkbox (extras). Equivale a ExtrasSection del kiosko.
export function MultiOptionSection({
  option,
  selected,
  onToggle,
}: {
  option: ProductOption;
  selected: string[];
  onToggle: (choiceId: string) => void;
}) {
  return (
    <section className="mb-7">
      <SectionTitle title={option.label} required={option.required} />
      <div className="overflow-hidden rounded-2xl border border-amaz-border bg-white">
        {option.choices.map((c, i) => {
          const on = selected.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(c.id)}
              className={`flex min-h-14 w-full items-center gap-3.5 px-4 text-left ${
                i > 0 ? 'border-t border-amaz-border-light' : ''
              } ${on ? 'bg-amaz-green/[0.04]' : ''}`}
            >
              <span
                className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] border-2 ${
                  on ? 'border-amaz-green bg-amaz-green text-amaz-cream' : 'border-[#cdbf98] bg-white'
                }`}
              >
                {on && <CheckIcon size={16} strokeWidth={2.6} />}
              </span>
              <span className="flex-1 text-[15px] font-medium text-amaz-ink">{c.label}</span>
              {c.extraPrice > 0 && <span className="text-sm text-amaz-gold-muted">+ {formatPrice(c.extraPrice)}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// Fila de opción tipo radio en lista (sabores de combo, diálogo de opciones).
export function RadioRow({
  label,
  extraPrice,
  selected,
  onClick,
}: {
  label: string;
  extraPrice: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`mb-2 flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left ${
        selected ? 'border-[1.5px] border-amaz-green bg-amaz-green/[0.06]' : 'border-amaz-border bg-white'
      }`}
    >
      <span>
        <span className="block text-[15px] font-medium text-amaz-ink">{label}</span>
        {extraPrice > 0 && <span className="text-[13px] text-amaz-sub">+ {formatPrice(extraPrice)}</span>}
      </span>
      <span
        className={`h-5 w-5 shrink-0 rounded-full border bg-white ${
          selected ? 'border-[5px] border-amaz-green' : 'border-[1.5px] border-amaz-border'
        }`}
      />
    </button>
  );
}

// Slot de bebida en combos: sabor (+ leche). Equivale a _ComboDrinkSlot del kiosko;
// en web la leche se elige dentro del mismo desplegable en lugar de un popup.
export function ComboSlot({
  number,
  label,
  flavorOption,
  milkOption,
  selectedFlavorId,
  selectedMilkId,
  onFlavorSelect,
  onMilkSelect,
  defaultOpen,
}: {
  number: number;
  label: string;
  flavorOption: ProductOption;
  milkOption?: ProductOption;
  selectedFlavorId?: string;
  selectedMilkId?: string;
  onFlavorSelect: (id: string) => void;
  onMilkSelect: (id: string) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const flavor = flavorOption.choices.find((c) => c.id === selectedFlavorId);
  const milk = milkOption?.choices.find((c) => c.id === selectedMilkId);
  const complete = !!selectedFlavorId && (!milkOption || !!selectedMilkId);
  const summary = [flavor?.label, milk?.label].filter(Boolean).join(' · ');

  return (
    <div
      className={`mb-3 rounded-2xl border bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
        complete ? 'border-[1.5px] border-amaz-green/35' : 'border-amaz-border'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3.5 px-4 py-4 text-left"
      >
        <span
          className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-base font-bold ${
            complete ? 'bg-amaz-green text-white' : 'bg-amaz-border text-amaz-muted'
          }`}
        >
          {number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold uppercase tracking-[0.06em] text-amaz-green">{label}</span>
          <span className={`block truncate text-sm ${open || !summary ? 'text-amaz-muted' : 'text-amaz-ink'}`}>
            {open || !summary ? 'Elige tu sabor' : summary}
          </span>
        </span>
        <ChevronDownIcon
          size={22}
          className={`shrink-0 text-amaz-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-amaz-border px-4 pb-4 pt-3">
          <div role="radiogroup" aria-label={`Sabor ${label}`}>
            {flavorOption.choices.map((c) => (
              <RadioRow
                key={c.id}
                label={c.label}
                extraPrice={c.extraPrice}
                selected={selectedFlavorId === c.id}
                onClick={() => onFlavorSelect(c.id)}
              />
            ))}
          </div>
          {milkOption && (
            <div className="mt-3">
              <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.06em] text-amaz-green">Tipo de leche</p>
              <div className="flex flex-wrap gap-2">
                {milkOption.choices.map((c) => {
                  const on = selectedMilkId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => onMilkSelect(c.id)}
                      className={`min-h-11 rounded-xl border-2 px-3.5 text-sm font-semibold ${
                        on ? 'border-amaz-green bg-amaz-green text-amaz-cream' : 'border-amaz-border bg-white text-amaz-ink'
                      }`}
                    >
                      {c.label}
                      {c.extraPrice > 0 && ` +${formatPrice(c.extraPrice)}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function QtyStepper({
  qty,
  min = 1,
  max,
  onChange,
  size = 'md',
}: {
  qty: number;
  min?: number;
  max: number;
  onChange: (qty: number) => void;
  size?: 'sm' | 'md';
}) {
  const btn = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  return (
    <div className="flex items-center gap-1 rounded-[14px] border border-amaz-border bg-white p-1">
      <button
        type="button"
        aria-label="Quitar uno"
        disabled={qty <= min}
        onClick={() => onChange(qty - 1)}
        className={`${btn} flex items-center justify-center rounded-[10px] text-amaz-green disabled:text-amaz-border`}
      >
        <MinusIcon size={18} strokeWidth={2.2} />
      </button>
      <span className="min-w-7 text-center text-base font-bold text-amaz-ink" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        aria-label="Agregar uno"
        disabled={qty >= max}
        onClick={() => onChange(qty + 1)}
        className={`${btn} flex items-center justify-center rounded-[10px] text-amaz-green disabled:text-amaz-border`}
      >
        <PlusIcon size={18} strokeWidth={2.2} />
      </button>
    </div>
  );
}
