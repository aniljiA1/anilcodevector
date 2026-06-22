'use client';

import { useEffect, useState, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const PAGE_SIZE = 20;

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Stack of cursors so "Previous" can go back. cursorStack[0] is always
  // null (the first page). The current page's cursor is the last element.
  const [cursorStack, setCursorStack] = useState([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/categories`)
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  const fetchPage = useCallback(
    async (cursor) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
        if (category !== 'all') params.set('category', category);
        if (cursor) params.set('cursor', cursor);

        const res = await fetch(`${API_URL}/api/products?${params.toString()}`);
        if (!res.ok) throw new Error('Request failed');
        const data = await res.json();
        setItems(data.items);
        setHasMore(data.hasMore);
        return data.nextCursor;
      } catch (err) {
        setError('Failed to load products. Is the backend running?');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [category]
  );

  // Reset to page 1 whenever the category changes.
  useEffect(() => {
    setCursorStack([null]);
    setPageIndex(0);
    fetchPage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const goNext = async () => {
    const currentCursor = cursorStack[pageIndex];
    const nextCursor = await fetchPage(currentCursor);
    if (!nextCursor) return;
    const newStack = cursorStack.slice(0, pageIndex + 1);
    newStack.push(nextCursor);
    setCursorStack(newStack);
    setPageIndex(pageIndex + 1);
  };

  const goPrev = async () => {
    if (pageIndex === 0) return;
    const prevIndex = pageIndex - 1;
    const prevCursor = cursorStack[prevIndex];
    await fetchPage(prevCursor);
    setPageIndex(prevIndex);
  };

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ marginBottom: 4 }}>Product Browser</h1>
      <p style={{ color: '#666', marginTop: 0 }}>
        200,000 products &middot; newest first &middot; stable cursor pagination
      </p>

      <div style={{ margin: '20px 0', display: 'flex', gap: 12, alignItems: 'center' }}>
        <label htmlFor="category">Category:</label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <div style={{ background: 'white', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa', textAlign: 'left' }}>
              <th style={cellStyle}>Name</th>
              <th style={cellStyle}>Category</th>
              <th style={cellStyle}>Price</th>
              <th style={cellStyle}>Created At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={cellStyle} colSpan={4}>Loading…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td style={cellStyle} colSpan={4}>No products found.</td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p._id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={cellStyle}>{p.name}</td>
                  <td style={cellStyle}>{p.category}</td>
                  <td style={cellStyle}>${p.price.toFixed(2)}</td>
                  <td style={cellStyle}>{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button onClick={goPrev} disabled={pageIndex === 0 || loading} style={btnStyle}>
          ← Previous
        </button>
        <span style={{ color: '#666' }}>Page {pageIndex + 1}</span>
        <button onClick={goNext} disabled={!hasMore || loading} style={btnStyle}>
          Next →
        </button>
      </div>
    </main>
  );
}

const cellStyle = { padding: '10px 14px', fontSize: 14 };
const btnStyle = {
  padding: '8px 16px',
  borderRadius: 6,
  border: '1px solid #ccc',
  background: 'white',
  cursor: 'pointer',
};
