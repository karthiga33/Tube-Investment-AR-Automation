import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../api';
import './RejectedEmailsPage.css';

export default function RejectedEmailsPage() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await api.listRejectedEmails();
      setItems(data.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  return (
    <div className="rej-page">
      <div className="rej-header">
        <div className="rej-header-left">
          <h2 className="rej-title">Rejected Emails</h2>
          <span className="rej-subtitle">Files rejected at processing (duplicate/invalid)</span>
        </div>
        <div className="rej-header-right">
          <span className="rej-count">{items.length} rejected file{items.length !== 1 ? 's' : ''}</span>
          <button className="rej-refresh" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rej-error"><AlertCircle size={14}/> {error}</div>
      )}

      {loading && !items.length ? (
        <div className="rej-loading"><RefreshCw size={20} className="spin"/> Loading…</div>
      ) : items.length === 0 ? (
        <div className="rej-empty">No rejected files found.</div>
      ) : (
        <div className="rej-table-wrap">
          <table className="rej-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Rejected At</th>
                <th>Reason</th>
                <th>Source</th>
                <th>Input Key</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={`${item.file_name}-${item.rejected_at}-${idx}`}>
                  <td className="rej-fname">{item.file_name || '—'}</td>
                  <td>{fmt(item.rejected_at)}</td>
                  <td className="rej-reason">{item.reason || '—'}</td>
                  <td><span className="rej-source-badge">{item.source || '—'}</span></td>
                  <td className="rej-key">{item.input_key || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
