'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { usePeriod, Period } from '@/lib/period-context';

interface OrderItem {
  productId: string;
  productName: string;
  qty?: number;
  quantity?: number;
  lineTotal?: number;
  subtotal?: number;
  unitPrice?: number;
  options?: string;
  sizeLabel?: string;
}

interface Order {
  id: string;
  number: number;
  customerName: string;
  deliveryType: string;
  status: string;
  total: number;
  paymentMethod?: string;
  createdAt: Timestamp;
  items: OrderItem[];
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
}

interface DashboardStats {
  totalVendido: number;
  pedidos: number;
  productosVendidos: number;
  ticketPromedio: number;
  prevTotalVendido: number;
  prevPedidos: number;
  prevProductosVendidos: number;
}

interface PaymentBreakdown {
  efectivo: number;
  yape: number;
  tarjeta: number;
  otro: number;
}

interface TopProduct {
  name: string;
  qty: number;
}

/* ─── Helpers ────────────────────────────────────────────── */
function getDateRange(period: Period, date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  if (period === 'dia') {
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    return { start: d, end: next, prevStart: prev, prevEnd: d };
  }
  if (period === 'semana') {
    const day = d.getDay();
    const mon = new Date(d);
    mon.setDate(d.getDate() - ((day + 6) % 7));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 7);
    const prevMon = new Date(mon);
    prevMon.setDate(mon.getDate() - 7);
    return { start: mon, end: sun, prevStart: prevMon, prevEnd: mon };
  }
  // mes
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const prevStart = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const prevEnd = start;
  return { start, end, prevStart, prevEnd };
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

function formatCurrency(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function computeStats(orders: Order[]): Pick<DashboardStats, 'totalVendido' | 'pedidos' | 'productosVendidos' | 'ticketPromedio'> {
  const totalVendido = orders.reduce((s, o) => s + (o.total || 0), 0);
  const pedidos = orders.length;
  const productosVendidos = orders.reduce(
    (s, o) => s + o.items.reduce((si, i) => si + (i.qty ?? i.quantity ?? 1), 0),
    0,
  );
  const ticketPromedio = pedidos > 0 ? totalVendido / pedidos : 0;
  return { totalVendido, pedidos, productosVendidos, ticketPromedio };
}

function computePayments(orders: Order[]): PaymentBreakdown {
  const bp: PaymentBreakdown = { efectivo: 0, yape: 0, tarjeta: 0, otro: 0 };
  for (const o of orders) {
    const m = (o.paymentMethod ?? 'otro').toLowerCase();
    const total = o.total || 0;
    if (m === 'efectivo') bp.efectivo += total;
    else if (m === 'tarjeta') bp.tarjeta += total;
    else if (m === 'yape' || m === 'plin' || m === 'yape_plin') bp.yape += total;
    else bp.otro += total;
  }
  return bp;
}

function computeTopProducts(orders: Order[]): TopProduct[] {
  const map = new Map<string, number>();
  for (const o of orders) {
    for (const item of o.items) {
      const name = item.productName || item.productId || 'Producto';
      const qty = item.qty ?? item.quantity ?? 1;
      map.set(name, (map.get(name) ?? 0) + qty);
    }
  }
  return Array.from(map.entries())
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
}

function getIngredientStatus(current: number, min: number) {
  if (current > min) return 'ok';
  if (current <= min * 0.5) return 'critico';
  return 'bajo';
}

function deliveryLabel(t: string) {
  if (t === 'alPaso' || t === 'al_paso') return 'Al paso';
  if (t === 'paraLlevar' || t === 'para_llevar') return 'Para llevar';
  return t;
}

function orderHour(ts: Timestamp) {
  const d = ts.toDate();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function orderItemsSummary(items: OrderItem[]) {
  return items
    .map((i) => i.productName || i.productId)
    .filter(Boolean)
    .join(', ');
}

/* ─── Component ──────────────────────────────────────────── */
export default function DashboardPage() {
  const { period, selectedDate } = usePeriod();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [payments, setPayments] = useState<PaymentBreakdown | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end, prevStart, prevEnd } = getDateRange(period, selectedDate);

      const [snap, prevSnap, ingSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, 'orders'),
            where('createdAt', '>=', Timestamp.fromDate(start)),
            where('createdAt', '<', Timestamp.fromDate(end)),
            orderBy('createdAt', 'desc'),
          ),
        ),
        getDocs(
          query(
            collection(db, 'orders'),
            where('createdAt', '>=', Timestamp.fromDate(prevStart)),
            where('createdAt', '<', Timestamp.fromDate(prevEnd)),
          ),
        ),
        getDocs(collection(db, 'ingredients')),
      ]);

      const currentOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
      const prevOrders = prevSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
      const ingredientList = ingSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Ingredient));

      const curr = computeStats(currentOrders);
      const prev = computeStats(prevOrders);

      setOrders(currentOrders);
      setStats({
        ...curr,
        prevTotalVendido: prev.totalVendido,
        prevPedidos: prev.pedidos,
        prevProductosVendidos: prev.productosVendidos,
      });
      setPayments(computePayments(currentOrders));
      setTopProducts(computeTopProducts(currentOrders));
      setIngredients(ingredientList);
    } finally {
      setLoading(false);
    }
  }, [period, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { start: rangeStart } = getDateRange(period, selectedDate);
  const periodLabel =
    period === 'dia'
      ? formatDate(selectedDate)
      : period === 'semana'
        ? `Semana del ${formatDate(rangeStart)}`
        : `${selectedDate.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}`;

  const lowOrCritical = ingredients.filter((i) => getIngredientStatus(i.currentStock, i.minStock) !== 'ok');

  const paymentTotal = payments ? payments.efectivo + payments.yape + payments.tarjeta + payments.otro : 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Page header */}
      <div>
        <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          ¡Hola, Administrador!
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
          Resumen general de tu negocio · {periodLabel}
        </p>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard
          icon={<DollarIcon />}
          label="TOTAL VENDIDO"
          value={formatCurrency(stats?.totalVendido ?? 0)}
          change={stats ? pctChange(stats.totalVendido, stats.prevTotalVendido) : null}
          loading={loading}
        />
        <StatCard
          icon={<BagIcon />}
          label="PEDIDOS"
          value={String(stats?.pedidos ?? 0)}
          change={stats ? pctChange(stats.pedidos, stats.prevPedidos) : null}
          loading={loading}
        />
        <StatCard
          icon={<CupIcon />}
          label="PRODUCTOS VENDIDOS"
          value={String(stats?.productosVendidos ?? 0)}
          change={stats ? pctChange(stats.productosVendidos, stats.prevProductosVendidos) : null}
          loading={loading}
        />
        <StatCard
          icon={<ReceiptIcon />}
          label="TICKET PROMEDIO"
          value={formatCurrency(stats?.ticketPromedio ?? 0)}
          change={null}
          loading={loading}
          noChange
        />
      </div>

      {/* Main 3-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px 340px', gap: 16, alignItems: 'start' }}>
        {/* Col 1 — Sales + Top products */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Ventas del período */}
          <Card>
            <SectionTitle number={1} title={`VENTAS ${period === 'dia' ? 'DEL DÍA' : period === 'semana' ? 'DE LA SEMANA' : 'DEL MES'}`} />
            {loading ? (
              <LoadingSkeleton rows={5} />
            ) : orders.length === 0 ? (
              <EmptyState message="No hay ventas en este período." />
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['Hora', 'Nº Pedido', 'Productos', 'Tipo', 'Total'].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: '8px 10px',
                            textAlign: h === 'Total' ? 'right' : 'left',
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            letterSpacing: 0.5,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 8).map((o, i) => (
                      <tr
                        key={o.id}
                        style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : '#faf9f7' }}
                      >
                        <td style={{ padding: '10px 10px', fontSize: 13, color: 'var(--text-muted)' }}>
                          {orderHour(o.createdAt)}
                        </td>
                        <td style={{ padding: '10px 10px', fontSize: 13, fontWeight: 600, color: 'var(--green-dark)' }}>
                          #{o.number}
                        </td>
                        <td style={{ padding: '10px 10px', fontSize: 13, color: 'var(--text)', maxWidth: 200 }}>
                          <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {orderItemsSummary(o.items)}
                          </span>
                        </td>
                        <td style={{ padding: '10px 10px', fontSize: 13, color: 'var(--text-muted)' }}>
                          {deliveryLabel(o.deliveryType)}
                        </td>
                        <td style={{ padding: '10px 10px', fontSize: 13, fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>
                          S/ {o.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length > 8 && (
                  <div style={{ marginTop: 12, textAlign: 'center' }}>
                    <button
                      onClick={() => router.push('/pedidos')}
                      style={{
                        padding: '8px 20px',
                        border: '1.5px solid var(--border)',
                        borderRadius: 8,
                        background: 'transparent',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-sub)',
                        cursor: 'pointer',
                      }}
                    >
                      Ver todas las ventas ({orders.length})
                    </button>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* Top products */}
          <Card>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, margin: '0 0 16px' }}>
              PRODUCTOS MÁS VENDIDOS
            </p>
            {loading ? (
              <LoadingSkeleton rows={5} />
            ) : topProducts.length === 0 ? (
              <EmptyState message="Sin datos." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topProducts.map((p, i) => {
                  const maxQty = topProducts[0]?.qty ?? 1;
                  const pct = (p.qty / maxQty) * 100;
                  return (
                    <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', width: 16 }}>{i + 1}.</span>
                      <span style={{ fontSize: 13, color: 'var(--text)', minWidth: 140, flex: 1 }}>{p.name}</span>
                      <div style={{ flex: 2, height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--green-dark)', borderRadius: 5 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', minWidth: 28, textAlign: 'right' }}>{p.qty}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Col 2 — Caja */}
        <Card>
          <SectionTitle number={2} title="CAJA / RESUMEN DE PAGOS" />
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, marginBottom: 20 }}>
            Resumen del período: {periodLabel}
          </p>

          {loading ? (
            <LoadingSkeleton rows={4} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <PaymentRow
                icon={<EfectivoIcon />}
                label="EFECTIVO"
                amount={payments?.efectivo ?? 0}
                total={paymentTotal}
              />
              <PaymentRow
                icon={<YapeIcon />}
                label="YAPE / PLIN"
                amount={payments?.yape ?? 0}
                total={paymentTotal}
              />
              <PaymentRow
                icon={<TarjetaIcon />}
                label="TARJETA"
                amount={payments?.tarjeta ?? 0}
                total={paymentTotal}
              />
              {(payments?.otro ?? 0) > 0 && (
                <PaymentRow
                  icon={<OtroIcon />}
                  label="OTRO"
                  amount={payments?.otro ?? 0}
                  total={paymentTotal}
                />
              )}

              <div style={{ borderTop: '2px solid var(--border)', paddingTop: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'var(--green-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, margin: 0 }}>TOTAL GENERAL</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '2px 0 0' }}>{formatCurrency(paymentTotal)}</p>
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-sub)' }}>100%</span>
              </div>
            </div>
          )}
        </Card>

        {/* Col 3 — Inventario */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <SectionTitle number={3} title="INVENTARIO" inline />
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: 'var(--green-dark)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
              Registrar entrada
            </button>
          </div>

          {loading ? (
            <LoadingSkeleton rows={6} />
          ) : ingredients.length === 0 ? (
            <EmptyState message="No hay ingredientes registrados." />
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    {['Insumo / Producto', 'Stock actual', 'Mínimo', 'Estado'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '6px 8px',
                          textAlign: h === 'Estado' ? 'center' : 'left',
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          letterSpacing: 0.4,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ing) => {
                    const status = getIngredientStatus(ing.currentStock, ing.minStock);
                    return (
                      <tr key={ing.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 8px', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{ing.name}</td>
                        <td style={{ padding: '10px 8px', fontSize: 13, color: 'var(--text-muted)' }}>{ing.currentStock} {ing.unit}</td>
                        <td style={{ padding: '10px 8px', fontSize: 13, color: 'var(--text-muted)' }}>{ing.minStock} {ing.unit}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <StatusBadge status={status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {lowOrCritical.length > 0 && (
                <div
                  style={{
                    marginTop: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderRadius: 8,
                    padding: '10px 12px',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span style={{ fontSize: 12, color: '#D97706', fontWeight: 500 }}>
                    Hay {lowOrCritical.length} insumo{lowOrCritical.length > 1 ? 's' : ''} con stock bajo o crítico
                  </span>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '20px 22px',
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ number, title, inline }: { number: number; title: string; inline?: boolean }) {
  const el = (
    <p
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--text)',
        letterSpacing: 0.5,
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span style={{ color: 'var(--text-muted)', fontWeight: 800 }}>{number}.</span>
      {title}
    </p>
  );
  if (inline) return el;
  return <div style={{ marginBottom: 4 }}>{el}</div>;
}

function StatCard({
  icon,
  label,
  value,
  change,
  loading,
  noChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: number | null;
  loading: boolean;
  noChange?: boolean;
}) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '20px 22px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: '#EFF6EF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'var(--green-dark)',
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.8, margin: '0 0 4px' }}>
          {label}
        </p>
        {loading ? (
          <div style={{ width: 100, height: 28, background: 'var(--border)', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ) : (
          <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', lineHeight: 1.1 }}>{value}</p>
        )}
        {!noChange && (
          <p style={{ fontSize: 12, color: change !== null && change >= 0 ? '#16a34a' : '#dc2626', margin: 0, fontWeight: 500 }}>
            {change !== null ? (
              <>
                {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs. período anterior
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>vs. período anterior</span>
            )}
          </p>
        )}
        {noChange && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>vs. período anterior</p>
        )}
      </div>
    </div>
  );
}

function PaymentRow({ icon, label, amount, total }: { icon: React.ReactNode; label: string; amount: number; total: number }) {
  const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : '0.0';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, margin: '0 0 2px' }}>{label}</p>
        <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{formatCurrency(amount)}</p>
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>{pct}%</span>
    </div>
  );
}

function StatusBadge({ status }: { status: 'ok' | 'bajo' | 'critico' }) {
  const config = {
    ok: { label: 'OK', bg: 'var(--status-ok-bg)', color: 'var(--status-ok)' },
    bajo: { label: 'BAJO', bg: 'var(--status-low-bg)', color: 'var(--status-low)' },
    critico: { label: 'CRÍTICO', bg: 'var(--status-critical-bg)', color: 'var(--status-critical)' },
  }[status];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 8px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        background: config.bg,
        color: config.color,
        letterSpacing: 0.5,
      }}
    >
      {config.label}
    </span>
  );
}

function LoadingSkeleton({ rows }: { rows: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 32,
            background: 'var(--border)',
            borderRadius: 6,
            opacity: 1 - i * 0.12,
          }}
        />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
      {message}
    </div>
  );
}

/* ─── Icons ──────────────────────────────────────────────── */
function DollarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12M8 10h8M8 14h8" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
function CupIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
    </svg>
  );
}
function ReceiptIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 2 2 2-2 2 2 2-2 3 2V4a2 2 0 0 0-2-2z" />
      <line x1="16" y1="8" x2="8" y2="8" /><line x1="16" y1="12" x2="8" y2="12" /><line x1="11" y1="16" x2="8" y2="16" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function EfectivoIcon() {
  return (
    <div style={{ width: 48, height: 48, background: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M6 12h.01M18 12h.01" />
      </svg>
    </div>
  );
}
function YapeIcon() {
  return (
    <div style={{ width: 48, height: 48, background: '#7C3AED', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <path d="M8 12l3 3 5-6" />
      </svg>
    </div>
  );
}
function TarjetaIcon() {
  return (
    <div style={{ width: 48, height: 48, background: '#DBEAFE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    </div>
  );
}
function OtroIcon() {
  return (
    <div style={{ width: 48, height: 48, background: 'var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </div>
  );
}
