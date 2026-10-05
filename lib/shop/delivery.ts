// Zonas de delivery y su costo. El costo NO se guarda en Firestore:
// solo se muestra en la web y en el mensaje de WhatsApp.
export const DELIVERY_ZONES = [
  { id: 'san_miguel', label: 'San Miguel', fee: 3 },
  { id: 'magdalena', label: 'Magdalena', fee: 4 },
  { id: 'callao', label: 'Callao', fee: 3 },
  { id: 'pueblo_libre', label: 'Pueblo Libre', fee: 3.5 },
] as const;

export type DeliveryZone = (typeof DELIVERY_ZONES)[number];

export const findZone = (id: string): DeliveryZone | undefined => DELIVERY_ZONES.find((z) => z.id === id);
