import Link from 'next/link';
import { ArrowRightIcon, ChatIcon, CupIcon, HandIcon } from '@/components/shop/icons';
import { FeaturedProducts, HeroImage } from './_home';

const FEATURES = [
  { icon: HandIcon, text: 'Pide fácil, sin descargar nada' },
  { icon: CupIcon, text: 'Elige tamaño y extras' },
  { icon: ChatIcon, text: 'Te confirmamos por WhatsApp' },
];

export default function HomePage() {
  return (
    <>
      <section className="bg-[radial-gradient(120%_90%_at_20%_0%,#244a39_0%,#14291d_55%,#0d1c13_100%)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-10 px-5 pb-13 pt-11">
          <div className="min-w-0 flex-[1_1_340px] animate-fade-in">
            <p className="mb-4 font-mono text-xs tracking-[0.2em] text-amaz-gold">PEDIDOS ONLINE · DELIVERY</p>
            <h1 className="mb-4.5 font-playfair text-[clamp(38px,6vw,66px)] font-bold leading-[1.04] text-amaz-cream text-pretty">
              Tus frappés favoritos, a un solo clic
            </h1>
            <p className="mb-7 max-w-[460px] text-lg leading-relaxed text-[#c9d5cc]">
              Arma tu pedido en minutos y envíalo directo a nuestro WhatsApp. Nosotros lo preparamos al momento.
            </p>
            <ul className="mb-8.5 flex flex-col gap-3.5">
              {FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3.5">
                  <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full border-[1.5px] border-amaz-gold text-amaz-gold">
                    <Icon size={20} strokeWidth={1.6} />
                  </span>
                  <span className="text-[17px] text-amaz-cream">{text}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/menu"
              className="inline-flex min-h-[58px] items-center gap-3 rounded-2xl bg-amaz-gold px-7.5 text-lg font-bold tracking-[0.02em] text-amaz-gold-dark transition-transform active:scale-[0.98]"
            >
              Hacer mi pedido <ArrowRightIcon size={20} strokeWidth={2.2} />
            </Link>
          </div>
          <HeroImage />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-14 pt-10">
        <div className="mb-4.5 flex items-baseline justify-between gap-3">
          <h2 className="font-playfair text-[28px] font-bold text-amaz-green">Los más pedidos</h2>
          <Link href="/menu" className="flex min-h-11 items-center text-[15px] font-semibold text-amaz-green">
            Ver todo el menú →
          </Link>
        </div>
        <FeaturedProducts />
      </section>
    </>
  );
}
