import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, CheckCircle, XCircle, FileJson, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { api } from '../api';
import './StatusPage.css';

const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};
const fmtSize = (b) => {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(1)} MB`;
};

export default function StatusPage() {
  const navigate = useNavigate();
  const [approved, setApproved] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [a, r] = await Promise.all([api.listApproved(), api.listRejected()]);
      setApproved(a.files || []);
      setRejected(r.files || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="status-page">
      <div className="status-header">
        <h1 className="status-title">Document Status</h1>
        <div className="status-header-right">
          <span className="s3-tag">s3://claude-test-tube/</span>
          <button className="btn-back" onClick={() => navigate('/')}>← Dashboard</button>
          <button className="btn-refresh-sm" onClick={load} disabled={loading}>
            <RefreshCw size={12} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="status-error">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {loading ? (
        <div className="status-loading">
          <RefreshCw size={22} className="spin" />
          <p>Loading from S3…</p>
        </div>
      ) : (
        <div className="status-grid">
          {/* Approved panel */}
          <FileListPanel
            title="Approved Files"
            s3Path="Approved/"
            files={approved}
            type="approved"
            emptyMsg="No approved files yet"
            icon={<CheckCircle size={16} className="icon-green" />}
          />
          {/* Rejected panel */}
          <FileListPanel
            title="Rejected Files"
            s3Path="Reject/"
            files={rejected}
            type="rejected"
            emptyMsg="No rejected files yet"
            icon={<XCircle size={16} className="icon-red" />}
          />
        </div>
      )}
    </div>
  );
}

function FileListPanel({ title, s3Path, files, type, emptyMsg, icon }) {
  return (
    <div className={`status-panel panel-${type}`}>
      <div className="panel-hdr">
        <div className="panel-hdr-left">
          {icon}
          <span className="panel-title">{title}</span>
          <span className={`count-pill pill-${type}`}>{files.length}</span>
        </div>
        <span className="panel-s3">s3://claude-test-tube/{s3Path}</span>
      </div>

      {files.length === 0 ? (
        <div className="panel-empty">
          <p>{emptyMsg}</p>
        </div>
      ) : (
        <table className="status-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Size</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {files.map(f => (
              <tr key={f.key} className="status-row">
                <td className="sfile-cell">
                  {type === 'approved'
                    ? <FileJson       size={14} className="icon-green" />
                    : <FileSpreadsheet size={14} className="icon-red"  />
                  }
                  <span className="sfile-name" title={f.name}>{f.name}</span>
                </td>
                <td>{fmtSize(f.size)}</td>
                <td>{fmt(f.last_modified)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
