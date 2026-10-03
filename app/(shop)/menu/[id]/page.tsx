import { Suspense } from 'react';
import ProductDetail from './ProductDetail';

export default function ProductPage() {
  return (
    <Suspense>
      <ProductDetail />
    </Suspense>
  );
}
