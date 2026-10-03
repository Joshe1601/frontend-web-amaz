'use client';

import type { Customization, Product, ProductOption } from '@/lib/shop/types';
import { isCombo, toggleChoice } from '@/lib/shop/pricing';
import { ComboSlot, MultiOptionSection, SingleOptionSection, SizesSection } from './options';

const FLAVOR_RX = /^(.+)_flavor_(\d+)$/;

function drinkTypeName(type: string) {
  switch (type) {
    case 'latte':
      return 'Latte';
    case 'frappe':
      return 'Frappé';
    case 'iced_latte':
      return 'Iced Latte';
    case 'hot_coffee':
      return 'Hot Coffee';
    default:
      return type
        .split('_')
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' ');
  }
}

// Renderiza tamaños y opciones dinámicas desde Firestore con la misma lógica
// que ProductDetailScreen del kiosko (combos → slots de bebida sabor + leche).
export default function ProductCustomizer({
  product,
  customization,
  onChange,
}: {
  product: Product;
  customization: Customization;
  onChange: (c: Customization) => void;
}) {
  const setChoices = (option: ProductOption, choiceId: string) =>
    onChange({ ...customization, selectedChoices: toggleChoice(customization.selectedChoices, option, choiceId) });

  if (isCombo(product)) {
    const flavorOptions = product.options.filter((o) => o.required && FLAVOR_RX.test(o.id));
    const typeCount: Record<string, number> = {};
    for (const fo of flavorOptions) {
      const t = FLAVOR_RX.exec(fo.id)![1];
      typeCount[t] = (typeCount[t] ?? 0) + 1;
    }
    const typeIdx: Record<string, number> = {};

    return (
      <>
        {flavorOptions.map((fo, i) => {
          const type = FLAVOR_RX.exec(fo.id)![1];
          typeIdx[type] = (typeIdx[type] ?? 0) + 1;
          const name = drinkTypeName(type);
          const label = typeCount[type] === 1 ? name : `${name} ${typeIdx[type]}`;
          const milkOption = product.options.find((o) => o.id === fo.id.replace('_flavor_', '_milk_'));
          return (
            <ComboSlot
              key={fo.id}
              number={i + 1}
              label={label}
              flavorOption={fo}
              milkOption={milkOption}
              selectedFlavorId={customization.selectedChoices[fo.id]?.[0]}
              selectedMilkId={milkOption ? customization.selectedChoices[milkOption.id]?.[0] : undefined}
              onFlavorSelect={(id) => setChoices(fo, id)}
              onMilkSelect={(id) => milkOption && setChoices(milkOption, id)}
              defaultOpen={i === 0}
            />
          );
        })}
      </>
    );
  }

  return (
    <>
      {product.sizes.length > 1 && (
        <SizesSection
          sizes={product.sizes}
          selectedSizeId={customization.selectedSizeId}
          onSelect={(sizeId) => onChange({ ...customization, selectedSizeId: sizeId })}
        />
      )}
      {product.options.map((option) => {
        const selected = customization.selectedChoices[option.id] ?? [];
        return option.multiSelect ? (
          <MultiOptionSection
            key={option.id}
            option={option}
            selected={selected}
            onToggle={(id) => setChoices(option, id)}
          />
        ) : (
          <SingleOptionSection
            key={option.id}
            option={option}
            selected={selected}
            onSelect={(id) => setChoices(option, id)}
          />
        );
      })}
    </>
  );
}
