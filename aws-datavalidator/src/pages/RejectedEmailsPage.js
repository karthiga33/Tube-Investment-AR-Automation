import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../api';
import './RejectedEmailsPage.css';

export default function RejectedEmailsPage() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filterName, setFilterName] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

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

  // Apply filters
  const filtered = items.filter(item => {
    if (filterName && !(item.file_name || '').toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterFrom) {
      const from = new Date(filterFrom);
      if (new Date(item.rejected_at) < from) return false;
    }
    if (filterTo) {
      const to = new Date(filterTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(item.rejected_at) > to) return false;
    }
    return true;
  });

  return (
    <div className="rej-page">
      <div className="rej-header">
        <div className="rej-header-left">
          <h2 className="rej-title">Rejected Emails</h2>
          <span className="rej-subtitle">Files rejected at processing (duplicate/invalid)</span>
        </div>
        <div className="rej-header-right">
          <span className="rej-count">{filtered.length} rejected file{filtered.length !== 1 ? 's' : ''}</span>
          <button className="rej-refresh" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rej-filters">
        <input
          className="rej-filter-input"
          placeholder="Search file name..."
          value={filterName}
          onChange={e => setFilterName(e.target.value)}
        />
        <div className="rej-date-filter">
          <label>From:</label>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
        </div>
        <div className="rej-date-filter">
          <label>To:</label>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
        </div>
        {(filterName || filterFrom || filterTo) && (
          <button className="rej-clear-btn" onClick={() => { setFilterName(''); setFilterFrom(''); setFilterTo(''); }}>
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="rej-error"><AlertCircle size={14}/> {error}</div>
      )}

      {loading && !items.length ? (
        <div className="rej-loading"><RefreshCw size={20} className="spin"/> Loading…</div>
      ) : filtered.length === 0 ? (
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
              {filtered.map((item, idx) => (
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
