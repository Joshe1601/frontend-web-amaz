import { Suspense } from 'react';
import MenuView from './MenuView';

export default function MenuPage() {
  return (
    <Suspense>
      <MenuView />
    </Suspense>
  );
}
