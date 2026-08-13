'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type Period = 'dia' | 'semana' | 'mes';

interface PeriodContextType {
  period: Period;
  setPeriod: (p: Period) => void;
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
}

const PeriodContext = createContext<PeriodContextType>({
  period: 'dia',
  setPeriod: () => {},
  selectedDate: new Date(),
  setSelectedDate: () => {},
});

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<Period>('dia');
  const [selectedDate, setSelectedDate] = useState(new Date());

  return (
    <PeriodContext.Provider value={{ period, setPeriod, selectedDate, setSelectedDate }}>
      {children}
    </PeriodContext.Provider>
  );
}

export const usePeriod = () => useContext(PeriodContext);

export function toInputDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
