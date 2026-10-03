import Link from 'next/link';
import { ArrowLeftIcon } from './icons';

const STEPS = ['Carrito', 'Datos', 'Confirmar'];

// Encabezado de los pasos del checkout: volver + título + progreso.
export default function StepHeader({ step, title, backHref }: { step: 1 | 2 | 3; title: string; backHref: string }) {
  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center gap-1.5" aria-label={`Paso ${step} de 3`}>
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col gap-1.5">
            <span className={`h-1 rounded-full ${i < step ? 'bg-amaz-green' : 'bg-amaz-border'}`} />
            <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${i < step ? 'text-amaz-green' : 'text-amaz-muted'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          aria-label="Volver"
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-amaz-green hover:bg-amaz-border/50"
        >
          <ArrowLeftIcon size={22} strokeWidth={2.2} />
        </Link>
        <h1 className="font-playfair text-[28px] font-bold text-amaz-green">{title}</h1>
      </div>
    </div>
  );
}
