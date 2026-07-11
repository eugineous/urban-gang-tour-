'use client';

// Shop products — single source of truth for public/v25-template.html's shop
// grid and every checkout route's server-side pricing (lib/server/catalog.ts
// getProducts()). See app/api/site-data/products/route.ts for the public
// read side.

import { useCallback, useEffect, useState } from 'react';
import {
  OC, card, btn, btnDark, btnMagenta, btnSmall, inp, label, h3, td, th,
  Chip, opsGet, opsPost, Toast, useToast,
  SearchBox, useSearch,
} from './ui';

interface Product {
  id: string; name: string; price: number; image: string; category: string;
  description: string; active: boolean;
}

const EMPTY = { id: '', name: '', price: 0, image: '', category: 'Apparel', description: '', active: true };
const CATEGORIES = ['Apparel', 'Headwear', 'Accessories'];

export default function Products() {
  const [rows, setRows] = useState<Product[]>([]);
  const [edit, setEdit] = useState<typeof EMPTY | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [qy, setQy] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  const reload = useCallback(async () => {
    const { data } = await opsGet('products');
    if (data.error) say('Load failed: ' + data.error);
    else setRows((data.rows || []).map((r: any) => ({ ...r, price: Number(r.price) })));
  }, [say]);
  useEffect(() => { reload(); }, [reload]);

  const save = async () => {
    if (!edit || !edit.name.trim()) { say('Name is required'); return; }
    if (edit.price <= 0) { say('Price must be greater than 0'); return; }
    setBusy(true);
    const { data } = await opsPost('product.save', {
      id: edit.id || undefined, name: edit.name, price: edit.price, image: edit.image,
      category: edit.category, description: edit.description, active: edit.active,
    });
    setBusy(false);
    if (data.error) { say('Failed: ' + data.error); return; }
    say('Saved');
    setEdit(null);
    reload();
  };

  const retire = async (p: Product) => {
    if (!confirm(`Retire "${p.name}"? It stops appearing in the shop but past orders still show its name and price.`)) return;
    const { data } = await opsPost('product.delete', { id: p.id });
    if (data.error) say('Failed: ' + data.error); else { say('Retired'); reload(); }
  };

  const restore = async (p: Product) => {
    const { data } = await opsPost('product.save', { id: p.id, name: p.name, price: p.price, image: p.image, category: p.category, description: p.description, active: true });
    if (data.error) say('Failed: ' + data.error); else { say('Restored'); reload(); }
  };

  const byActive = rows.filter((p) => showInactive || p.active);
  const visible = useSearch(byActive, qy);

  if (edit) {
    return (
      <div style={card}>
        <Toast msg={toast} />
        <h3 style={h3}>{edit.id ? 'EDIT PRODUCT' : 'NEW PRODUCT'}</h3>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div><span style={label}>Name *</span><input style={inp} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Magenta Oversized Tee" /></div>
          <div><span style={label}>Price (KES) *</span><input style={inp} type="number" min={0} value={edit.price} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) || 0 })} /></div>
          <div><span style={label}>Category</span>
            <select style={inp} value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><span style={label}>Image path</span><input style={inp} value={edit.image} onChange={(e) => setEdit({ ...edit, image: e.target.value })} placeholder="/assets/merch/tee.png" /></div>
        </div>
        <div style={{ marginTop: 10 }}>
          <span style={label}>Description</span>
          <textarea style={{ ...inp, minHeight: 70 }} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13 }}>
          <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Active (visible in the shop)
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button style={btnMagenta} disabled={busy} onClick={save}>Save product</button>
          <button style={btnDark} onClick={() => setEdit(null)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Toast msg={toast} />
      <div style={card}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
          <h3 style={{ ...h3, marginBottom: 0 }}>SHOP PRODUCTS</h3>
          <div style={{ flex: 1 }} />
          <SearchBox value={qy} onChange={setQy} placeholder="Search products..." />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show retired
          </label>
          <button style={btn} onClick={() => setEdit({ ...EMPTY })}>+ New product</button>
        </div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
          Live: prices here are what every checkout route (M-Pesa, Paystack, Stripe) actually charges — never trust a price the browser sends. A change is live on the site within about a minute. Retiring a product keeps its id so past orders/receipts still resolve correctly.
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr>{['id', 'name', 'price', 'category', 'status', ''].map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td style={td}><code style={{ fontSize: 11 }}>{p.id}</code></td>
                  <td style={td}><b>{p.name}</b></td>
                  <td style={td}>KES {p.price.toLocaleString()}</td>
                  <td style={td}>{p.category}</td>
                  <td style={td}>{p.active ? <Chip text="active" bg="#E7F5EE" color={OC.green} /> : <Chip text="retired" bg="#eee" />}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button style={btnSmall} onClick={() => setEdit({ id: p.id, name: p.name, price: p.price, image: p.image, category: p.category, description: p.description, active: p.active })}>Edit</button>
                      {p.active
                        ? <button style={{ ...btnSmall, background: '#111', color: '#fff' }} onClick={() => retire(p)}>Retire</button>
                        : <button style={btnSmall} onClick={() => restore(p)}>Restore</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!visible.length && <tr><td style={td} colSpan={6}>{byActive.length ? 'No products match your search.' : 'No products in this filter.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
