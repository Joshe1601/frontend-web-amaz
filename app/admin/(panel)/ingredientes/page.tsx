'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  updatedAt?: Timestamp;
}

type Modal =
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'stock'; ingredient: Ingredient }
  | { type: 'edit'; ingredient: Ingredient };

function getStatus(current: number, min: number): 'ok' | 'bajo' | 'critico' {
  if (current > min) return 'ok';
  if (current <= min * 0.5) return 'critico';
  return 'bajo';
}

function StatusBadge({ status }: { status: 'ok' | 'bajo' | 'critico' }) {
  const cfg = {
    ok: { label: 'OK', bg: '#D1FAE5', color: '#065F46' },
    bajo: { label: 'BAJO', bg: '#FEF3C7', color: '#92400E' },
    critico: { label: 'CRÍTICO', bg: '#FEE2E2', color: '#991B1B' },
  }[status];
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 6,
      fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color, letterSpacing: 0.5,
    }}>
      {cfg.label}
    </span>
  );
}

export default function IngredientesPage() {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<Modal>({ type: 'none' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchIngredients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const snap = await getDocs(query(collection(db, 'ingredients'), orderBy('name')));
      setIngredients(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ingredient)));
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? '';
      setError(
        code === 'permission-denied'
          ? 'Sin permisos para leer ingredientes. Revisa las Security Rules de Firestore.'
          : `Error al cargar ingredientes (${code || 'desconocido'}).`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIngredients(); }, [fetchIngredients]);

  const filtered = ingredients.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()),
  );

  const critical = ingredients.filter((i) => getStatus(i.currentStock, i.minStock) === 'critico');
  const low = ingredients.filter((i) => getStatus(i.currentStock, i.minStock) === 'bajo');

  /* ── Add ingredient ── */
  async function handleAddIngredient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = (data.get('name') as string).trim();
    const unit = (data.get('unit') as string).trim();
    const currentStock = parseFloat(data.get('currentStock') as string) || 0;
    const minStock = parseFloat(data.get('minStock') as string) || 0;

    setSaving(true);
    try {
      await addDoc(collection(db, 'ingredients'), {
        name,
        unit,
        currentStock,
        minStock,
        lastUpdatedBy: user?.email ?? 'admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      await fetchIngredients();
      setModal({ type: 'none' });
    } catch (e: unknown) {
      alert(`Error al agregar: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  /* ── Register stock entry ── */
  async function handleStockEntry(e: React.FormEvent<HTMLFormElement>, ingredient: Ingredient) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const qty = parseFloat(data.get('qty') as string) || 0;
    if (qty <= 0) return;

    setSaving(true);
    try {
      const newStock = ingredient.currentStock + qty;
      await updateDoc(doc(db, 'ingredients', ingredient.id), {
        currentStock: newStock,
        lastUpdatedBy: user?.email ?? 'admin',
        updatedAt: Timestamp.now(),
      });
      // Log the entry
      await addDoc(collection(db, 'inventory_logs'), {
        type: 'entrada',
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantityChange: qty,
        relatedOrderId: null,
        performedBy: user?.email ?? 'admin',
        createdAt: Timestamp.now(),
      });
      await fetchIngredients();
      setModal({ type: 'none' });
    } catch (e: unknown) {
      alert(`Error al registrar: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  /* ── Edit min stock ── */
  async function handleEditIngredient(e: React.FormEvent<HTMLFormElement>, ingredient: Ingredient) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const minStock = parseFloat(data.get('minStock') as string) || 0;
    const currentStock = parseFloat(data.get('currentStock') as string) || 0;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'ingredients', ingredient.id), {
        minStock,
        currentStock,
        lastUpdatedBy: user?.email ?? 'admin',
        updatedAt: Timestamp.now(),
      });
      await fetchIngredients();
      setModal({ type: 'none' });
    } catch (e: unknown) {
      alert(`Error al editar: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Gestión de Ingredientes
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            {ingredients.length} insumo{ingredients.length !== 1 ? 's' : ''} registrado{ingredients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={fetchIngredients}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
              border: '1.5px solid var(--border)', borderRadius: 9, background: '#fff',
              fontSize: 13, fontWeight: 600, color: 'var(--text-sub)', cursor: 'pointer',
            }}
          >
            <RefreshIcon /> Actualizar
          </button>
          <button
            onClick={() => setModal({ type: 'add' })}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
              border: 'none', borderRadius: 9, background: 'var(--green-dark)',
              fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer',
            }}
          >
            + Agregar ingrediente
          </button>
        </div>
      </div>

      {/* Alert banners */}
      {critical.length > 0 && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertIcon color="#DC2626" />
          <span style={{ fontSize: 13, color: '#991B1B', fontWeight: 500 }}>
            <strong>{critical.length}</strong> insumo{critical.length !== 1 ? 's' : ''} en estado CRÍTICO:{' '}
            {critical.map((i) => i.name).join(', ')}
          </span>
        </div>
      )}
      {low.length > 0 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertIcon color="#D97706" />
          <span style={{ fontSize: 13, color: '#92400E', fontWeight: 500 }}>
            <strong>{low.length}</strong> insumo{low.length !== 1 ? 's' : ''} con stock BAJO:{' '}
            {low.map((i) => i.name).join(', ')}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#991B1B', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 14px', maxWidth: 360 }}>
        <SearchIcon />
        <input
          type="text"
          placeholder="Buscar ingrediente…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)', background: 'transparent', width: '100%' }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 56, background: '#fff', borderRadius: 12, border: '1px solid var(--border)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: '#fff', border: '1px solid var(--border)', borderRadius: 16,
          padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)',
        }}>
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>📦</p>
          <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Sin ingredientes</p>
          <p style={{ fontSize: 13, margin: '0 0 16px' }}>
            {search ? 'No coincide ningún ingrediente con tu búsqueda.' : 'Agrega el primer ingrediente con el botón de arriba.'}
          </p>
          {!search && (
            <button
              onClick={() => setModal({ type: 'add' })}
              style={{
                padding: '10px 20px', borderRadius: 9, background: 'var(--green-dark)',
                color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              + Agregar ingrediente
            </button>
          )}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', background: '#faf9f6' }}>
                {['Insumo / Producto', 'Unidad', 'Stock actual', 'Stock mínimo', 'Estado', 'Última actualización', 'Acciones'].map((h) => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ing, idx) => {
                const status = getStatus(ing.currentStock, ing.minStock);
                return (
                  <tr key={ing.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : '#faf9f6' }}>
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                      {ing.name}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                      {ing.unit}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 700, color: status === 'critico' ? '#DC2626' : status === 'bajo' ? '#D97706' : 'var(--text)' }}>
                      {ing.currentStock} {ing.unit}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                      {ing.minStock} {ing.unit}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge status={status} />
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {ing.updatedAt ? ing.updatedAt.toDate().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setModal({ type: 'stock', ingredient: ing })}
                          style={{
                            padding: '6px 12px', borderRadius: 7, border: 'none',
                            background: 'var(--green-dark)', color: '#fff',
                            fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          + Entrada
                        </button>
                        <button
                          onClick={() => setModal({ type: 'edit', ingredient: ing })}
                          style={{
                            padding: '6px 12px', borderRadius: 7,
                            border: '1.5px solid var(--border)', background: 'transparent',
                            fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', cursor: 'pointer',
                          }}
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ── */}
      {modal.type !== 'none' && (
        <div
          onClick={() => setModal({ type: 'none' })}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 20, padding: '28px 32px',
              width: '100%', maxWidth: 420,
              boxShadow: '0 24px 64px rgba(0,0,0,.18)',
            }}
          >
            {modal.type === 'add' && (
              <>
                <ModalTitle title="Agregar ingrediente" onClose={() => setModal({ type: 'none' })} />
                <form onSubmit={handleAddIngredient} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
                  <Field label="Nombre del insumo" name="name" placeholder="Ej: Café en grano" required />
                  <Field label="Unidad de medida" name="unit" placeholder="Ej: kg, L, unid." required />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Stock inicial" name="currentStock" type="number" placeholder="0" min="0" step="0.01" required />
                    <Field label="Stock mínimo" name="minStock" type="number" placeholder="0" min="0" step="0.01" required />
                  </div>
                  <ModalActions onCancel={() => setModal({ type: 'none' })} saving={saving} label="Agregar" />
                </form>
              </>
            )}

            {modal.type === 'stock' && (
              <>
                <ModalTitle title={`Registrar entrada`} onClose={() => setModal({ type: 'none' })} />
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  Insumo: <strong style={{ color: 'var(--text)' }}>{modal.ingredient.name}</strong>
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 16px' }}>
                  Stock actual: <strong style={{ color: 'var(--text)' }}>{modal.ingredient.currentStock} {modal.ingredient.unit}</strong>
                </p>
                <form onSubmit={(e) => handleStockEntry(e, modal.ingredient)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Field
                    label={`Cantidad a agregar (${modal.ingredient.unit})`}
                    name="qty"
                    type="number"
                    placeholder="0"
                    min="0.01"
                    step="0.01"
                    required
                  />
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#166534' }}>
                    El nuevo stock será registrado en <strong>inventory_logs</strong>.
                  </div>
                  <ModalActions onCancel={() => setModal({ type: 'none' })} saving={saving} label="Registrar entrada" />
                </form>
              </>
            )}

            {modal.type === 'edit' && (
              <>
                <ModalTitle title={`Editar: ${modal.ingredient.name}`} onClose={() => setModal({ type: 'none' })} />
                <form onSubmit={(e) => handleEditIngredient(e, modal.ingredient)} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field
                      label={`Stock actual (${modal.ingredient.unit})`}
                      name="currentStock"
                      type="number"
                      placeholder="0"
                      defaultValue={modal.ingredient.currentStock}
                      min="0"
                      step="0.01"
                      required
                    />
                    <Field
                      label={`Stock mínimo (${modal.ingredient.unit})`}
                      name="minStock"
                      type="number"
                      placeholder="0"
                      defaultValue={modal.ingredient.minStock}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <ModalActions onCancel={() => setModal({ type: 'none' })} saving={saving} label="Guardar cambios" />
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Shared sub-components ─────────────────────────── */

function ModalTitle({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
        {title}
      </h2>
      <button
        type="button" onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  );
}

function Field({
  label, name, type = 'text', placeholder, required, min, step, defaultValue,
}: {
  label: string; name: string; type?: string; placeholder?: string;
  required?: boolean; min?: string; step?: string; defaultValue?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)' }}>{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
        defaultValue={defaultValue}
        style={{
          border: '1.5px solid var(--border)', borderRadius: 9,
          padding: '10px 14px', fontSize: 14, color: 'var(--text)',
          outline: 'none', background: '#faf9f6',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--green-dark)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />
    </div>
  );
}

function ModalActions({ onCancel, saving, label }: { onCancel: () => void; saving: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
      <button
        type="button" onClick={onCancel}
        style={{
          flex: 1, padding: '11px', border: '1.5px solid var(--border)', borderRadius: 9,
          background: 'transparent', fontSize: 14, fontWeight: 600,
          color: 'var(--text-sub)', cursor: 'pointer',
        }}
      >
        Cancelar
      </button>
      <button
        type="submit" disabled={saving}
        style={{
          flex: 2, padding: '11px', border: 'none', borderRadius: 9,
          background: saving ? '#8a6e2e' : 'var(--green-dark)',
          fontSize: 14, fontWeight: 700, color: '#fff',
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? 'Guardando…' : label}
      </button>
    </div>
  );
}

function AlertIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
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
