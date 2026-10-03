import ShopHeader from '@/components/shop/ShopHeader';
import { ProductsProvider } from '@/lib/shop/products';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProductsProvider>
      <div className="flex min-h-screen flex-col bg-amaz-cream font-sans text-amaz-ink">
        <ShopHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-amaz-border px-5 py-5 text-center text-[13px] text-amaz-muted">
          AMAZ COFFEE · Café en remolque · Pedidos por WhatsApp
        </footer>
      </div>
    </ProductsProvider>
  );
}
