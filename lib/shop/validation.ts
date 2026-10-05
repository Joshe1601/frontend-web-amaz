import { findZone } from './delivery';
import type { CustomerInfo } from './types';

export type CustomerErrors = Partial<Record<keyof CustomerInfo, string>>;

export function validateCustomer(c: CustomerInfo): CustomerErrors {
  const errors: CustomerErrors = {};
  if (!c.name.trim()) errors.name = 'Ingresa tu nombre';
  if (!findZone(c.zone)) errors.zone = 'Elige tu zona de delivery';
  if (!c.address.trim()) errors.address = 'Ingresa la dirección de entrega';
  return errors;
}
