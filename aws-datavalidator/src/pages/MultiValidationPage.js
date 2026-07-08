import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCw, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../api';
import DocumentPreviewPane from '../components/DocumentPreviewPane';
import './MultiValidationPage.css';

export default function MultiValidationPage() {
  const { state }  = useLocation();
  const navigate   = useNavigate();

  const fileKey   = state?.fileKey  || '';
  const fileName  = state?.fileName || '';

  const [customers,  setCustomers]  = useState([]);
  const [inputFile,  setInputFile]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast,      setToast]      = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Load output data + find input file ────────────────────────────────────
  const load = useCallback(async () => {
    if (!fileKey) { navigate('/'); return; }
    setLoading(true); setError(null);
    try {
      const [data, inputInfo] = await Promise.all([
        api.multiLoadFile(fileKey),
        api.multiFindInput(fileKey).catch(() => ({ found: false })),
      ]);

      const custs = (data.customers || []).map((c, ci) => ({
        ...c,
        status: 'pending',
        rows: (c.rows || []).map((r, ri) => ({ ...r, _id: `${ci}-${ri}` })),
      }));
      setCustomers(custs);

      if (inputInfo?.found && inputInfo?.key) {
        setInputFile({ ...inputInfo, url: api.viewUrl(inputInfo.key) });
      } else {
        setInputFile(null);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fileKey, navigate]);

  useEffect(() => { load(); }, [load]);

  // ── Per-customer actions ──────────────────────────────────────────────────
  const updateCustomer = (idx, patch) =>
    setCustomers(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));

  const selectAllCustomer = (idx) =>
    updateCustomer(idx, {
      status: 'approved',
      rows: customers[idx].rows.map(r => ({ ...r, _status: 'approved' })),
    });

  const rejectCustomer = (idx) =>
    updateCustomer(idx, {
      status: 'rejected',
      rows: customers[idx].rows.map(r => ({ ...r, _status: 'rejected' })),
    });

  // Per-row status — auto-update customer status based on rows
  const setRowStatus = (custIdx, rowIdx, status) => {
    setCustomers(prev => prev.map((c, i) => {
      if (i !== custIdx) return c;
      const newRows = c.rows.map((r, ri) =>
        ri === rowIdx ? { ...r, _status: status } : r
      );
      // Derive customer status from rows
      const allApproved = newRows.every(r => r._status === 'approved');
      const allRejected = newRows.every(r => r._status === 'rejected');
      const custStatus  = allApproved ? 'approved' : allRejected ? 'rejected' : 'pending';
      return { ...c, rows: newRows, status: custStatus };
    }));
  };

  // ── Global approve / reject ───────────────────────────────────────────────
  const handleApproveAll = async () => {
    const pending = customers.filter(c => c.status === 'pending').length;
    if (pending > 0) {
      showToast(`${pending} customer(s) still pending — approve or reject each one first.`, 'error');
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.multiApproveFile({
        input_key: fileKey,
        customers: stripMeta(customers.filter(c => c.status === 'approved')),
      });
      const count = result.customers?.length || 0;
      showToast(`${count} customer(s) approved and sent ✓`);
      setTimeout(() => navigate('/'), 1200);
    } catch (e) {
      showToast(`Approve failed: ${e.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Per-customer approve ──────────────────────────────────────────────────
  const handleApproveCustomer = async (idx) => {
    const cust = customers[idx];
    // First mark all rows approved
    const approved = {
      ...cust,
      status: 'approved',
      rows: cust.rows.map(r => ({ ...r, _status: 'approved' })),
    };
    updateCustomer(idx, approved);
    try {
      const result = await api.multiCustomerApprove({
        input_key: fileKey,
        customer:  stripMeta([approved])[0],
      });
      const apiStatus = result.api_result?.status;
      showToast(
        apiStatus === 'success'
          ? `${cust.cust_name} approved ✓`
          : apiStatus === 'skipped'
          ? `${cust.cust_name} approved (API not configured)`
          : `${cust.cust_name} approved — API: ${apiStatus}`,
        apiStatus === 'success' || apiStatus === 'skipped' ? 'success' : 'warn'
      );
    } catch (e) {
      showToast(`Approve failed: ${e.message}`, 'error');
    }
  };

  const handleRejectAll = async () => {
    setSubmitting(true);
    const allRejected = customers.map(c => ({ ...c, status: 'rejected' }));
    try {
      await api.multiRejectFile({ input_key: fileKey, customers: stripMeta(allRejected) });
      showToast('All customers rejected');
      setTimeout(() => navigate('/'), 1200);
    } catch (e) {
      showToast(`Reject failed: ${e.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const stripMeta = (custs) =>
    custs.map(c => ({
      ...c,
      rows: c.rows.map(({ _id, ...r }) => r),
    }));

  const approvedCount = customers.filter(c => c.status === 'approved').length;
  const rejectedCount = customers.filter(c => c.status === 'rejected').length;
  const pendingCount  = customers.filter(c => c.status === 'pending').length;

  if (!fileKey) return null;

  return (
    <div className="mvp-page">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="mvp-topbar">
        <div className="mvp-topbar-left">
          <button className="mvp-back" onClick={() => navigate('/')}>
            <ChevronLeft size={14}/> Back
          </button>
          <button className="mvp-back" onClick={load} title="Refresh">
            <RefreshCw size={13}/>
          </button>
          <div className="mvp-filename-wrap">
            <span className="mvp-filename">📄 {fileName}</span>
            <span className="mvp-tag">Multi-Customer</span>
          </div>
        </div>
        <div className="mvp-topbar-right">
          <span className="mvp-badge mvp-badge-green">{approvedCount} APPROVED</span>
          <span className="mvp-badge mvp-badge-red">{rejectedCount} REJECTED</span>
          <span className="mvp-badge mvp-badge-yellow">{pendingCount} PENDING</span>
          <button
            className="mvp-btn-reject-top"
            onClick={handleRejectAll}
            disabled={submitting}
          >
            Reject All
          </button>
          <button
            className={`mvp-btn-approve-top ${pendingCount > 0 ? 'mvp-btn-blocked' : ''}`}
            onClick={handleApproveAll}
            disabled={submitting}
            title={pendingCount > 0 ? `${pendingCount} customer(s) still pending` : 'Approve All'}
          >
            {submitting ? '…' : 'Approve All'}
          </button>
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div className="mvp-error"><AlertCircle size={13}/> {error}</div>
      )}

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="mvp-loading">
          <RefreshCw size={22} className="spin"/> Loading from S3…
        </div>
      ) : (
        /* ── Split pane ─────────────────────────────────────────────────── */
        <div className="mvp-split">

          {/* LEFT — Document preview */}
          <div className="mvp-pane mvp-pane-left">
            <div className="mvp-pane-hdr">
              <span className="mvp-pane-label">DOCUMENT PREVIEW</span>
              <span className="mvp-pane-sub">{inputFile?.name || fileName}</span>
            </div>
            <div className="mvp-preview-wrap">
              <DocumentPreviewPane
                fileName={inputFile?.name || fileName}
                previewUrl={inputFile?.url || null}
                inputExt={inputFile?.ext || null}
                header={{}}
              />
            </div>
          </div>

          {/* RIGHT — Extracted multi-customer data */}
          <div className="mvp-pane mvp-pane-right">
            <div className="mvp-pane-hdr">
              <span className="mvp-pane-label">EXTRACTED DATA</span>
              <span className="mvp-pane-sub">{customers.length} customer{customers.length !== 1 ? 's' : ''}</span>
            </div>

            {customers.length === 0 ? (
              <div className="mvp-empty">No customer data found in this file.</div>
            ) : (
              <div className="mvp-customers-scroll">
                {customers.map((cust, idx) => (
                  <CustomerBlock
                    key={`${cust.cust_no}-${idx}`}
                    cust={cust}
                    onApprove={() => handleApproveCustomer(idx)}
                    onSelectAll={() => selectAllCustomer(idx)}
                    onReject={() => rejectCustomer(idx)}
                    onRowStatus={(rowIdx, status) => setRowStatus(idx, rowIdx, status)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Toast ───────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`mvp-toast mvp-toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}

// ── Single customer block ─────────────────────────────────────────────────────
function CustomerBlock({ cust, onApprove, onSelectAll, onReject, onRowStatus }) {
  const cols = (cust.columns || []).filter(c => !c.startsWith('_'));

  const blockClass = cust.status === 'approved'
    ? 'mvp-cust-block mvp-cust-approved'
    : cust.status === 'rejected'
    ? 'mvp-cust-block mvp-cust-rejected'
    : 'mvp-cust-block';

  return (
    <div className={blockClass}>
      {/* Customer header row */}
      <div className="mvp-cust-header">
        <div className="mvp-cust-info">
          {cust.cust_no && (
            <span className="mvp-cust-no">#{cust.cust_no}</span>
          )}
          <span className="mvp-cust-name">{cust.cust_name}</span>
          <span className="mvp-cust-count">
            {cust.rows.length} row{cust.rows.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="mvp-cust-btns">
          {cust.status === 'approved' && (
            <span className="mvp-status-pill mvp-status-approved">
              <CheckCircle2 size={12}/> Approved
            </span>
          )}
          {cust.status === 'rejected' && (
            <span className="mvp-status-pill mvp-status-rejected">
              <XCircle size={12}/> Rejected
            </span>
          )}
          <button className="mvp-btn-approve-cust" onClick={onApprove}>
            ✓ Approve
          </button>
          <button className="mvp-btn-select" onClick={onSelectAll}>
            Select All
          </button>
          <button className="mvp-btn-reject-cust" onClick={onReject}>
            ✕ Reject
          </button>
        </div>
      </div>

      {/* Data table */}
      <div className="mvp-tbl-wrap">
        <table className="mvp-tbl">
          <thead>
            <tr>
              <th className="mvp-th-num">#</th>
              {cols.map(col => <th key={col}>{col}</th>)}
              <th className="mvp-th-status">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {cust.rows.map((row, ri) => (
              <tr key={row._id || ri} className={
                row._status === 'approved' ? 'mvp-row-approved' :
                row._status === 'rejected' ? 'mvp-row-rejected' : ''
              }>
                <td className="mvp-td-num">{ri + 1}</td>
                {cols.map(col => (
                  <td key={col}>{row[col] ?? '—'}</td>
                ))}
                <td className="mvp-td-status">
                  <div className="mvp-row-btns">
                    <button
                      className={`mvp-row-approve ${row._status === 'approved' ? 'mvp-row-btn-active-green' : ''}`}
                      onClick={() => onRowStatus(ri, 'approved')}
                      title="Approve"
                    >✓</button>
                    <button
                      className={`mvp-row-reject ${row._status === 'rejected' ? 'mvp-row-btn-active-red' : ''}`}
                      onClick={() => onRowStatus(ri, 'rejected')}
                      title="Reject"
                    >✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
