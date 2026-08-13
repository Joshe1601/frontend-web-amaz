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
import { db } from '@/lib/firebase';
import { usePeriod } from '@/lib/period-context';

interface OrderItem {
  productId?: string;
  productName?: string;
  qty?: number;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
  subtotal?: number;
  sizeLabel?: string;
  options?: string;
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

type StatusFilter = 'todos' | 'pending' | 'preparing' | 'ready' | 'delivered';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  preparing: 'En preparación',
  ready: 'Listo',
  delivered: 'Entregado',
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#FEF9C3', color: '#854D0E' },
  preparing: { bg: '#DBEAFE', color: '#1D4ED8' },
  ready: { bg: '#D1FAE5', color: '#065F46' },
  delivered: { bg: '#F3F4F6', color: '#374151' },
};

function getDateRange(period: string, date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (period === 'dia') {
    const next = new Date(d); next.setDate(next.getDate() + 1);
    return { start: d, end: next };
  }
  if (period === 'semana') {
    const day = d.getDay();
    const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 7);
    return { start: mon, end: sun };
  }
  return { start: new Date(d.getFullYear(), d.getMonth(), 1), end: new Date(d.getFullYear(), d.getMonth() + 1, 1) };
}

function formatTime(ts: Timestamp) {
  const d = ts.toDate();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateTime(ts: Timestamp) {
  const d = ts.toDate();
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function deliveryLabel(t: string) {
  if (t === 'alPaso' || t === 'al_paso') return 'Al paso';
  if (t === 'paraLlevar' || t === 'para_llevar') return 'Para llevar';
  return t;
}

function paymentLabel(m?: string) {
  if (!m) return '—';
  if (m === 'efectivo') return 'Efectivo';
  if (m === 'tarjeta') return 'Tarjeta';
  if (m === 'yape' || m === 'plin' || m === 'yape_plin') return 'Yape/Plin';
  return m;
}

export default function PedidosPage() {
  const { period, selectedDate } = usePeriod();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { start, end } = getDateRange(period, selectedDate);
      const snap = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', Timestamp.fromDate(start)),
          where('createdAt', '<', Timestamp.fromDate(end)),
          orderBy('createdAt', 'desc'),
        ),
      );
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? '';
      setError(code === 'permission-denied'
        ? 'Sin permisos para leer pedidos. Revisa las Security Rules de Firestore.'
        : `Error al cargar pedidos (${code || 'desconocido'}).`);
    } finally {
      setLoading(false);
    }
  }, [period, selectedDate]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'todos' && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        String(o.number).includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.items.some((i) => i.productName?.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const total = filtered.reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Historial de Pedidos
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            {filtered.length} pedido{filtered.length !== 1 ? 's' : ''} · Total: S/ {total.toFixed(2)}
          </p>
        </div>
        <button
          onClick={fetchOrders}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', border: '1.5px solid var(--border)',
            borderRadius: 9, background: '#fff', fontSize: 13,
            fontWeight: 600, color: 'var(--text-sub)', cursor: 'pointer',
          }}
        >
          <RefreshIcon /> Actualizar
        </button>
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#fff', border: '1px solid var(--border)',
          borderRadius: 9, padding: '8px 14px', flex: '1 1 220px',
        }}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Buscar por #pedido, cliente, producto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)', background: 'transparent', width: '100%' }}
          />
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', background: '#fff', border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden' }}>
          {(['todos', 'pending', 'preparing', 'ready', 'delivered'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '8px 14px', fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: statusFilter === s ? 'var(--green-dark)' : 'transparent',
                color: statusFilter === s ? '#fff' : 'var(--text-sub)',
                whiteSpace: 'nowrap',
              }}
            >
              {s === 'todos' ? 'Todos' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#991B1B', fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 60, background: '#fff', borderRadius: 12, border: '1px solid var(--border)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: '#fff', border: '1px solid var(--border)', borderRadius: 16,
          padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)',
        }}>
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>📋</p>
          <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Sin pedidos</p>
          <p style={{ fontSize: 13, margin: 0 }}>No hay pedidos para este período o filtro.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', background: '#faf9f6' }}>
                {['Hora', 'Nº Pedido', 'Cliente', 'Productos', 'Tipo', 'Pago', 'Total', 'Estado', ''].map((h) => (
                  <th key={h} style={{
                    padding: '12px 14px', textAlign: h === 'Total' ? 'right' : 'left',
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <>
                  <tr
                    key={o.id}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  >
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                      {formatTime(o.createdAt)}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: 'var(--green-dark)' }}>
                      #{o.number}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text)' }}>
                      {o.customerName || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text)', maxWidth: 200 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {o.items.map((i) => i.productName || i.productId).filter(Boolean).join(', ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                      {deliveryLabel(o.deliveryType)}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                      {paymentLabel(o.paymentMethod)}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>
                      S/ {o.total.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                        fontSize: 11, fontWeight: 700,
                        background: STATUS_STYLE[o.status]?.bg ?? '#F3F4F6',
                        color: STATUS_STYLE[o.status]?.color ?? '#374151',
                      }}>
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        style={{ transform: expanded === o.id ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s' }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </td>
                  </tr>
                  {expanded === o.id && (
                    <tr key={`${o.id}-detail`} style={{ background: '#faf9f6' }}>
                      <td colSpan={9} style={{ padding: '12px 24px 16px' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5, margin: '0 0 8px' }}>
                          DETALLE DEL PEDIDO · {formatDateTime(o.createdAt)}
                        </p>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                              {['Producto', 'Tamaño/Opciones', 'Cant.', 'Precio unit.', 'Subtotal'].map((h) => (
                                <th key={h} style={{
                                  padding: '6px 8px', textAlign: h === 'Subtotal' || h === 'Cant.' ? 'right' : 'left',
                                  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                                }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {o.items.map((item, idx) => (
                              <tr key={idx}>
                                <td style={{ padding: '8px 8px', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                                  {item.productName || item.productId}
                                </td>
                                <td style={{ padding: '8px 8px', fontSize: 12, color: 'var(--text-muted)' }}>
                                  {[item.sizeLabel, item.options].filter(Boolean).join(' · ') || '—'}
                                </td>
                                <td style={{ padding: '8px 8px', fontSize: 13, color: 'var(--text)', textAlign: 'right' }}>
                                  {item.qty ?? item.quantity ?? 1}
                                </td>
                                <td style={{ padding: '8px 8px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'right' }}>
                                  S/ {(item.unitPrice ?? 0).toFixed(2)}
                                </td>
                                <td style={{ padding: '8px 8px', fontSize: 13, fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>
                                  S/ {(item.lineTotal ?? item.subtotal ?? 0).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{ borderTop: '2px solid var(--border)' }}>
                              <td colSpan={4} style={{ padding: '8px 8px', fontSize: 13, fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>
                                TOTAL
                              </td>
                              <td style={{ padding: '8px 8px', fontSize: 14, fontWeight: 800, color: 'var(--green-dark)', textAlign: 'right' }}>
                                S/ {o.total.toFixed(2)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
