import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Plus, Trash2, Lock } from 'lucide-react';
import { api } from '../api';
import './PdfPasswordPage.css';

export default function PdfPasswordPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subject, setSubject] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listPdfPasswords();
      setItems(data.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !password.trim()) return;
    setSaving(true);
    try {
      await api.savePdfPassword({ subject: subject.trim(), password: password.trim() });
      setSubject('');
      setPassword('');
      load();
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (subj) => {
    if (!window.confirm(`Delete password entry for "${subj}"?`)) return;
    try {
      await api.deletePdfPassword(subj);
      setItems(prev => prev.filter(i => i.subject !== subj));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="pdf-password-page">
      <div className="pdf-password-card">
        <div className="pdf-password-header">
          <div className="pdf-header-left">
            <Lock size={18} />
            <h2>PDF with Password</h2>
            <span className="pdf-count">{items.length} entries</span>
          </div>
          <button className="btn-refresh" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>

        {/* Add new entry form */}
        <form className="pdf-add-form" onSubmit={handleSave}>
          <input
            className="pdf-input"
            placeholder="Subject (e.g. Payment Advice - BAJAJ)"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            required
          />
          <input
            className="pdf-input"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button className="btn-save" type="submit" disabled={saving}>
            <Plus size={14} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </form>

        {error && <div className="pdf-error">{error}</div>}

        {/* Table */}
        <div className="pdf-table-wrap">
          <table className="pdf-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Subject</th>
                <th>Password</th>
                <th>Created At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="pdf-empty">
                    {loading ? 'Loading...' : 'No password entries yet. Add one above.'}
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.subject}>
                    <td>{idx + 1}</td>
                    <td className="pdf-filename">{item.subject}</td>
                    <td className="pdf-pw">{item.password}</td>
                    <td className="pdf-date">
                      {item.created_at ? new Date(item.created_at).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: true,
                      }) : '—'}
                    </td>
                    <td>
                      <button className="btn-del" onClick={() => handleDelete(item.subject)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
