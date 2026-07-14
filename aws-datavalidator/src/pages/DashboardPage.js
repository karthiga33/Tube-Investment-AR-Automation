import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RefreshCw, FileSpreadsheet, AlertCircle, ChevronDown, Trash2 } from 'lucide-react';
import { api } from '../api';
import './DashboardPage.css';

const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};
const fmtSize = (b) => {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

const getFileType = (sourceType) => {
  if (!sourceType) return 'PDF';
  return sourceType.toUpperCase();
};

// ── Excel-style column filter dropdown ───────────────────────────────────────
function ColFilter({ label, type, options, value, onChange, onClear, active }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={`cf-wrap ${active ? 'cf-active' : ''}`} ref={ref}>
      <button
        className={`cf-btn ${active ? 'cf-btn-active' : ''}`}
        onClick={() => setOpen(o => !o)}
        title={`Filter by ${label}`}
      >
        {label}
        <ChevronDown size={11} className={`cf-arrow ${open ? 'cf-arrow-open' : ''}`} />
        {active && <span className="cf-dot" />}
      </button>

      {open && (
        <div className="cf-dropdown">
          <div className="cf-dropdown-title">{label}</div>

          {/* ── Checkbox filter (Status) ── */}
          {type === 'checkbox' && (
            <div className="cf-checkbox-list">
              {options.map(opt => (
                <label key={opt.value} className="cf-checkbox-item">
                  <input
                    type="checkbox"
                    checked={value.includes(opt.value)}
                    onChange={() => {
                      const next = value.includes(opt.value)
                        ? value.filter(v => v !== opt.value)
                        : [...value, opt.value];
                      onChange(next);
                    }}
                  />
                  <span className={`cf-badge cf-badge-${opt.value}`}>{opt.label}</span>
                </label>
              ))}
            </div>
          )}

          {/* ── Text search filter (Company, File Name) ── */}
          {type === 'text' && (
            <div className="cf-text-wrap">
              <input
                className="cf-text-input"
                placeholder={`Search ${label}…`}
                value={value}
                onChange={e => onChange(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {/* ── Date range filter ── */}
          {type === 'daterange' && (
            <div className="cf-date-wrap">
              <label className="cf-date-label">From</label>
              <input
                type="date"
                className="cf-date-input"
                value={value.from}
                onChange={e => onChange({ ...value, from: e.target.value })}
              />
              <label className="cf-date-label">To</label>
              <input
                type="date"
                className="cf-date-input"
                value={value.to}
                onChange={e => onChange({ ...value, to: e.target.value })}
              />
            </div>
          )}

          <div className="cf-footer">
            <button className="cf-clear" onClick={() => { onClear(); setOpen(false); }}>
              Clear
            </button>
            <button className="cf-apply" onClick={() => setOpen(false)}>
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Default filter state ──────────────────────────────────────────────────────
const DEFAULT_FILTERS = {
  name:          '',
  company:       '',
  mailId:        '',
  fileType:      [],            // [] = show all
  status:        [],           // [] = show all
  last_modified: { from: '', to: '' },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [files,   setFiles]   = useState([]);
  const [deleted, setDeleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showDeleted, setShowDeleted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [d, multiData] = await Promise.all([
        api.dashboard(),
        api.listMultiOutput().catch(() => ({ files: [] })),
      ]);
      const outputFiles = (d.output || []).map(f => ({ ...f, _isMulti: false }));
      const multiFiles = (multiData.files || []).map(f => ({
        ...f,
        _isMulti: true,
      }));
      // Deduplicate: use key+company as unique identifier
      const seen = new Set();
      const allFiles = [...outputFiles, ...multiFiles]
        .filter(f => {
          const id = `${f.key}|${f.company || ''}`;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        })
        .sort((a, b) => new Date(b.last_modified) - new Date(a.last_modified));
      setFiles(allFiles);
      setDeleted(d.deleted || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (location.state?.refresh) load(); }, [location.state, load]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const clearFilter = (key) => setFilters(f => ({ ...f, [key]: DEFAULT_FILTERS[key] }));
  const clearAll = () => setFilters(DEFAULT_FILTERS);

  // ── Apply all filters ─────────────────────────────────────────────────────
  const visible = files.filter(f => {
    if (filters.name && !f.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.company && !f.company.toLowerCase().includes(filters.company.toLowerCase())) return false;
    if (filters.mailId && !(f.mail_id || '').toLowerCase().includes(filters.mailId.toLowerCase())) return false;
    if (filters.fileType.length > 0 && !filters.fileType.includes(getFileType(f.source_type))) return false;
    if (filters.status.length > 0 && !filters.status.includes(f.status)) return false;
    if (filters.last_modified.from) {
      const from = new Date(filters.last_modified.from);
      if (new Date(f.last_modified) < from) return false;
    }
    if (filters.last_modified.to) {
      const to = new Date(filters.last_modified.to);
      to.setHours(23, 59, 59, 999);
      if (new Date(f.last_modified) > to) return false;
    }
    return true;
  });

  const anyActive =
    filters.name !== '' ||
    filters.company !== '' ||
    filters.mailId !== '' ||
    filters.fileType.length > 0 ||
    filters.status.length > 0 ||
    filters.last_modified.from !== '' ||
    filters.last_modified.to !== '';

  const counts = {
    total:    files.length,
    pending:  files.filter(f => f.status === 'pending').length,
    approved: files.filter(f => f.status === 'approved').length,
    rejected: files.filter(f => f.status === 'rejected').length,
    deleted:  deleted.length,
  };

  const handleDelete = async (file, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${file.company || file.name}"? It will be moved to Deleted folder.`)) return;
    try {
      await api.deleteFile(file.key);
      setFiles(prev => prev.filter(f => f.key !== file.key));
      setDeleted(prev => [...prev, { ...file, key: `Deleted/${file.name}` }]);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const openFile = (file) => {
    // Files from multi-output/ folder go to the multi-customer validation page
    const isMulti = file._isMulti === true;
    if (isMulti) {
      navigate('/multi-validate', { state: { fileKey: file.key, fileName: file.name } });
    } else {
      navigate('/validate', { state: { fileKey: file.key, fileName: file.name, company: file.company, fileStatus: file.status } });
    }
  };

  const statusBadge = (s) => {
    if (s === 'approved') return <span className="badge badge-green">Approved</span>;
    if (s === 'rejected') return <span className="badge badge-red">Rejected</span>;
    return                        <span className="badge badge-yellow">Pending</span>;
  };

  return (
    <div className="dashboard-page">

      {/* ── Summary cards ── */}
      <div className="summary-cards">
        <SummaryCard label="Total Files" value={counts.total}    color="blue"   onClick={() => { clearAll(); setShowDeleted(false); }} />
        <SummaryCard label="Pending"     value={counts.pending}  color="yellow" onClick={() => { setFilter('status', ['pending']); setShowDeleted(false); }} />
        <SummaryCard label="Approved"    value={counts.approved} color="green"  onClick={() => { setFilter('status', ['approved']); setShowDeleted(false); }} />
        <SummaryCard label="Rejected"    value={counts.rejected} color="red"    onClick={() => { setFilter('status', ['rejected']); setShowDeleted(false); }} />
        <SummaryCard label="Deleted"     value={counts.deleted}  color="gray"   onClick={() => setShowDeleted(true)} />
      </div>

      {/* ── File list ── */}
      <div className="file-list-card">
        <div className="file-list-header">
          <div className="fh-left">
            <h2 className="section-title">Extracted Files</h2>
            <span className="s3-path">s3://claude-test-tube/output/</span>
            {anyActive && (
              <button className="btn-clear-all" onClick={clearAll}>
                ✕ Clear all filters
              </button>
            )}
          </div>
          <div className="fh-right">
            <span className="showing-count">
              Showing {visible.length} of {files.length}
            </span>
            <button className="btn-refresh" onClick={load} disabled={loading}>
              <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="error-bar"><AlertCircle size={14} /> {error}</div>
        )}

        {loading && !files.length ? (
          <div className="loading-state">
            <RefreshCw size={20} className="spin" />
            <p>Loading files from S3…</p>
          </div>
        ) : (
          <div className="file-table-wrap">
            <table className="file-table">
              <thead>
                <tr>
                  {/* File Name */}
                  <th>
                    <ColFilter
                      label="File Name"
                      type="text"
                      value={filters.name}
                      onChange={v => setFilter('name', v)}
                      onClear={() => clearFilter('name')}
                      active={filters.name !== ''}
                    />
                  </th>
                  {/* File Type */}
                  <th>
                    <ColFilter
                      label="File Type"
                      type="checkbox"
                      options={[
                        { value: 'PDF',   label: 'PDF'   },
                        { value: 'DOC',   label: 'DOC'   },
                        { value: 'DOCX',  label: 'DOCX'  },
                        { value: 'EXCEL', label: 'EXCEL' },
                        { value: 'HTML',  label: 'HTML'  },
                        { value: 'TXT',   label: 'TXT'   },
                        { value: 'MULTI', label: 'MULTI' },
                      ]}
                      value={filters.fileType}
                      onChange={v => setFilter('fileType', v)}
                      onClear={() => clearFilter('fileType')}
                      active={filters.fileType.length > 0}
                    />
                  </th>
                  {/* Company */}
                  <th>
                    <ColFilter
                      label="Company"
                      type="text"
                      value={filters.company}
                      onChange={v => setFilter('company', v)}
                      onClear={() => clearFilter('company')}
                      active={filters.company !== ''}
                    />
                  </th>
                  <th>
                    <ColFilter
                      label="Mail ID"
                      type="text"
                      value={filters.mailId}
                      onChange={v => setFilter('mailId', v)}
                      onClear={() => clearFilter('mailId')}
                      active={filters.mailId !== ''}
                    />
                  </th>
                  <th className="plain-th">Size</th>
                  {/* Last Modified */}
                  <th>
                    <ColFilter
                      label="Last Modified"
                      type="daterange"
                      value={filters.last_modified}
                      onChange={v => setFilter('last_modified', v)}
                      onClear={() => clearFilter('last_modified')}
                      active={filters.last_modified.from !== '' || filters.last_modified.to !== ''}
                    />
                  </th>
                  {/* Status */}
                  <th>
                    <ColFilter
                      label="Status"
                      type="checkbox"
                      options={[
                        { value: 'pending',  label: 'Pending'  },
                        { value: 'approved', label: 'Approved' },
                        { value: 'rejected', label: 'Rejected' },
                      ]}
                      value={filters.status}
                      onChange={v => setFilter('status', v)}
                      onClear={() => clearFilter('status')}
                      active={filters.status.length > 0}
                    />
                  </th>
                  <th className="plain-th">Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="no-results">
                      No files match the current filters.&nbsp;
                      <button className="btn-clear-inline" onClick={clearAll}>Clear filters</button>
                    </td>
                  </tr>
                ) : (
                  visible.map((file, idx) => (
                    <tr key={`${file.key}-${file.company}-${idx}`} className={`file-row file-row-${file.status}`} onClick={() => openFile(file)}>
                      <td>
                        <div className="file-name-cell">
                          <FileSpreadsheet size={14} className="icon-excel" />
                          <span className="file-name-text" title={file.name}>{file.name}</span>
                          {file._isMulti && (
                            <span style={{ background: '#ede9fe', color: '#6d28d9', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', fontWeight: 700, marginLeft: '4px' }}>
                              MULTI
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="meta-cell">
                        <span className={`file-type-badge ftype-${getFileType(file.source_type).toLowerCase()}`}>
                          {getFileType(file.source_type)}
                        </span>
                      </td>
                      <td className="company-cell">{file.company}</td>
                      <td className="meta-cell">{file.mail_id || '—'}</td>
                      <td className="meta-cell">{fmtSize(file.size)}</td>
                      <td className="meta-cell">{fmt(file.last_modified)}</td>
                      <td>{statusBadge(file.status)}</td>
                      <td>
                        <div className="row-actions">
                          {file.status !== 'pending' && (
                            <span className={`status-action-label ${file.status === 'approved' ? 'sal-green' : 'sal-red'}`}>
                              {file.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                            </span>
                          )}
                          <button className="btn-open" onClick={e => { e.stopPropagation(); openFile(file); }}>
                            {file.status === 'pending' ? 'Open →' : 'Review →'}
                          </button>
                          <button className="btn-delete" onClick={e => handleDelete(file, e)} title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Deleted files panel ── */}
      {showDeleted && (
        <div className="file-list-card deleted-card">
          <div className="file-list-header">
            <div className="fh-left">
              <h2 className="section-title">Deleted Files</h2>
              <span className="s3-path">s3://claude-test-tube/Deleted/</span>
            </div>
            <div className="fh-right">
              <button className="btn-refresh" onClick={() => setShowDeleted(false)}>
                ✕ Close
              </button>
            </div>
          </div>
          <div className="file-table-wrap">
            {deleted.length === 0 ? (
              <div className="no-results" style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                No deleted files
              </div>
            ) : (
              <table className="file-table">
                <thead>
                  <tr>
                    <th className="plain-th">File Name</th>
                    <th className="plain-th">Size</th>
                    <th className="plain-th">Deleted On</th>
                  </tr>
                </thead>
                <tbody>
                  {deleted.map(f => (
                    <tr key={f.key} className="file-row">
                      <td>
                        <div className="file-name-cell">
                          <FileSpreadsheet size={14} className="icon-excel" />
                          <span className="file-name-text">{f.name}</span>
                        </div>
                      </td>
                      <td className="meta-cell">{fmtSize(f.size)}</td>
                      <td className="meta-cell">{fmt(f.last_modified)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const SummaryCard = ({ label, value, color, onClick }) => (
  <div className={`summary-card card-${color}`} onClick={onClick} style={{ cursor: 'pointer' }}>
    <div className="card-value">{value ?? 0}</div>
    <div className="card-label">{label}</div>
  </div>
);
