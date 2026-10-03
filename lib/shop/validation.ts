import type { CustomerInfo } from './types';

export type CustomerErrors = Partial<Record<keyof CustomerInfo, string>>;

// Celular peruano: 9 dígitos que empiezan en 9 (acepta +51, espacios y guiones).
export const phoneDigits = (phone: string) => phone.replace(/\D/g, '').replace(/^51(?=\d{9}$)/, '');

export function validateCustomer(c: CustomerInfo): CustomerErrors {
  const errors: CustomerErrors = {};
  if (!c.name.trim()) errors.name = 'Ingresa tu nombre';
  if (!/^9\d{8}$/.test(phoneDigits(c.phone))) errors.phone = 'Ingresa un celular válido de 9 dígitos';
  if (!c.address.trim()) errors.address = 'Ingresa la dirección de entrega';
  return errors;
}
