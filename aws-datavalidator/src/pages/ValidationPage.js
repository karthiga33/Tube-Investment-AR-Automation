import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../api';
import DocumentPreviewPane from '../components/DocumentPreviewPane';
import ExtractedDataPanel from '../components/ExtractedDataPanel';
import './ValidationPage.css';

export default function ValidationPage() {
  const { state } = useLocation();
  const navigate  = useNavigate();

  const fileKey    = state?.fileKey    || '';
  const fileName   = state?.fileName   || '';
  const company    = state?.company    || '';
  const fileStatus = state?.fileStatus || 'pending';
  const initialLocked = fileStatus === 'approved' || fileStatus === 'rejected';

  const [header,       setHeader]       = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [toast,        setToast]        = useState(null);
  const [inputFile,    setInputFile]    = useState(null);
  const [isLocked,     setIsLocked]     = useState(initialLocked);
  const [pendingFiles, setPendingFiles] = useState([]);  // list of pending file keys for "Next" navigation

  // Debounce ref for auto-save — prevents an API call on every single row click
  const saveTimer = useRef(null);
  const pendingSave = useRef(null);

  const flushSave = useCallback(() => {
    if (pendingSave.current) {
      api.saveState(pendingSave.current).catch(() => {});
      pendingSave.current = null;
    }
  }, []);

  const debouncedSave = useCallback((payload) => {
    pendingSave.current = payload;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 1500); // save 1.5s after last change
  }, [flushSave]);

  // ── Load file data ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!fileKey) { navigate('/'); return; }
    setLoading(true); setError(null);
    try {
      // Step 1: Load the extracted data first (contains import_ref / mail_id)
      const data = await api.loadFile(fileKey);
      setHeader(data.header || {});
      setTransactions(
        (data.transactions || []).map((t, i) => ({ ...t, _id: i + 1 }))
      );

      // Step 2: Use header metadata to find the correct input PDF
      const importRef = data.header?.import_ref || '';
      const mailId    = data.header?.mail_id || '';
      const inputInfo = await api.findInput(fileKey, importRef, mailId).catch(() => ({ found: false }));

      if (inputInfo?.found && inputInfo?.key) {
        setInputFile({ ...inputInfo, url: api.viewUrl(inputInfo.key) });
      } else {
        setInputFile(inputInfo);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fileKey, navigate]);

  useEffect(() => { load(); }, [load]);

  // Fetch pending files list for "Next" button navigation
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const d = await api.dashboard();
        const pending = (d.output || [])
          .filter(f => f.status === 'pending')
          .sort((a, b) => new Date(b.last_modified) - new Date(a.last_modified))
          .map(f => ({ key: f.key, name: f.name, company: f.company }));
        setPendingFiles(pending);
      } catch (e) {
        setPendingFiles([]);
      }
    };
    fetchPending();
  }, []);

  // Auto-save on transaction change — debounced
  const handleTransactionChange = useCallback((updated) => {
    setTransactions(updated);
    if (!header) return;
    debouncedSave({
      input_key:    fileKey,
      header,
      transactions: updated.map(({ _id, ...t }) => t),
    });
  }, [fileKey, header, debouncedSave]);

  // Auto-save on header change — debounced
  const handleHeaderChange = useCallback((updatedHeader) => {
    setHeader(updatedHeader);
    debouncedSave({
      input_key:    fileKey,
      header:       updatedHeader,
      transactions: transactions.map(({ _id, ...t }) => t),
    });
  }, [fileKey, transactions, debouncedSave]);

  // ── Counts ──────────────────────────────────────────────────────────────────
  const approvedCount = transactions.filter(t => t.status === 'approved').length;
  const rejectedCount = transactions.filter(t => t.status === 'rejected').length;
  const pendingCount  = transactions.filter(t => !t.status || t.status === 'pending').length;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Approve → validate all rows are actioned first ──────────────────────────
  const handleApprove = useCallback(async () => {
    // Block approve if any row is still pending
    if (pendingCount > 0) {
      showToast(
        `Please select all rows before approving. ${pendingCount} row${pendingCount > 1 ? 's' : ''} still pending.`,
        'error'
      );
      return;
    }

    flushSave(); // flush any pending debounced save first
    setSubmitting(true);
    const allApproved = transactions.map(t => ({ ...t, status: 'approved' }));
    try {
      const result = await api.approveFile({
        input_key:    fileKey,
        header,
        transactions: allApproved.map(({ _id, ...t }) => t),
      });

      let msg = result.demo_mode ? 'Demo mode: Approval simulated ✓' : `Saved to S3 ✓`;
      if (result.api_result) {
        const ar = result.api_result;
        if (ar.status === 'success')
          msg += `  |  Customer API: ${ar.http_code} OK`;
        else if (ar.status === 'skipped')
          msg += `  |  Customer API: not configured`;
        else
          msg += `  |  Customer API: ${ar.status} (${ar.http_code || ar.reason})`;
      }
      // Update import_ref from API response if provided
      if (result.import_reference) {
        setHeader(prev => ({ ...prev, import_ref: result.import_reference }));
      }
      showToast(msg, result.api_result?.status === 'success' || result.demo_mode ? 'success' : 'warn');
      // Stay on page in read-only mode instead of navigating away
      setIsLocked(true);
      // Remove current file from pending list
      setPendingFiles(prev => prev.filter(f => f.key !== fileKey));
    } catch (e) {
      showToast(`Approve failed: ${e.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [fileKey, header, transactions, pendingCount, flushSave]);

  // ── Reject all → POST /api/file/reject ──────────────────────────────────────
  const handleReject = useCallback(async () => {
    flushSave();
    setSubmitting(true);
    const allRejected = transactions.map(t => ({ ...t, status: 'rejected' }));
    try {
      const result = await api.rejectFile({
        input_key:    fileKey,
        header,
        transactions: allRejected.map(({ _id, ...t }) => t),
      });
      showToast(
        result.demo_mode
          ? 'Demo mode: Rejection simulated ✓'
          : `Rejected → ${result.s3_key}`,
        'warn'
      );
      // Stay on page in read-only mode instead of navigating away
      setIsLocked(true);
      // Remove current file from pending list
      setPendingFiles(prev => prev.filter(f => f.key !== fileKey));
    } catch (e) {
      showToast(`Reject failed: ${e.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [fileKey, header, transactions, flushSave]);

  // ── Navigate to next pending file ─────────────────────────────────────────────
  const handleNext = useCallback(() => {
    if (pendingFiles.length > 0) {
      const next = pendingFiles[0];
      navigate('/validate', {
        state: { fileKey: next.key, fileName: next.name, company: next.company, fileStatus: 'pending' },
        replace: true,
      });
      // Force re-render by reloading window (since same route)
      window.location.reload();
    } else {
      navigate('/', { state: { refresh: true } });
    }
  }, [pendingFiles, navigate]);

  if (!fileKey) return null;

  return (
    <div className="validation-page">
      {/* Sub-header bar */}
      <div className="doc-bar">
        <div className="doc-bar-left">
          <button className="nav-arrow" onClick={() => navigate('/')}><ChevronLeft size={14} /></button>
          <button className="nav-arrow" onClick={load}><RefreshCw size={13} /></button>

          <div className="doc-filename">
            <span>📄</span>
            <span className="fname-text" title={fileName}>{fileName}</span>
          </div>

          <div className="doc-sep" />

          <div className="doc-company">
            <span>🏢</span>
            <strong>{company}</strong>
          </div>

          <button className="btn-ai-guide">
            <Sparkles size={11} />
            AI Guide
          </button>
        </div>

        <div className="doc-bar-right">
          <span className="count-badge badge-green">{approvedCount} APPROVED</span>
          <span className="count-badge badge-red">{rejectedCount} REJECTED</span>
          <span className="count-badge badge-yellow">{pendingCount} PENDING</span>

          {isLocked ? (
            <>
              <span className="locked-badge">
                {fileStatus === 'approved' || !initialLocked ? '✓ Approved (Read Only)' : '✗ Rejected (Read Only)'}
              </span>
              <button
                className={`btn-next-file ${pendingFiles.length === 0 ? 'btn-next-disabled' : ''}`}
                onClick={handleNext}
                disabled={pendingFiles.length === 0 && initialLocked}
                title={pendingFiles.length > 0 ? `Next pending file (${pendingFiles.length} remaining)` : 'No more pending files'}
              >
                Next →
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-reject-doc"
                onClick={handleReject}
                disabled={submitting}
              >
                {submitting ? '...' : 'Reject'}
              </button>
              <button
                className={`btn-approve-doc ${pendingCount > 0 ? 'btn-approve-blocked' : ''}`}
                onClick={handleApprove}
                disabled={submitting}
                title={pendingCount > 0 ? `${pendingCount} row(s) still pending — select all first` : 'Approve'}
              >
                {submitting ? '...' : 'Approve'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="vp-error">
          <AlertCircle size={13} /> {error} — showing demo data
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="vp-loading">
          <RefreshCw size={22} className="spin" />
          <p>Loading from S3…</p>
        </div>
      ) : (
        /* Split pane */
        <div className="split-pane">
          <div className="pane pane-left">
            <div className="pane-hdr">
              <span className="pane-label">DOCUMENT PREVIEW</span>
              <span className="pane-sublabel">{inputFile?.found ? inputFile.name : fileName}</span>
            </div>
            <DocumentPreviewPane
              fileName={inputFile?.found ? inputFile.name : fileName}
              previewUrl={inputFile?.found ? inputFile.url : null}
              inputExt={inputFile?.found ? inputFile.ext : null}
              header={header || {}}
            />
          </div>

          <div className="pane pane-right">
            <ExtractedDataPanel
              header={header || {}}
              transactions={transactions}
              onTransactionChange={isLocked ? null : handleTransactionChange}
              onHeaderChange={isLocked ? null : handleHeaderChange}
              onExportExcel={() => handleExportExcel(header, transactions)}
              readOnly={isLocked}
            />
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}

function handleExportExcel(header, transactions) {
  // Build CSV as fallback (no xlsx lib needed client-side)
  const rows = [
    ['INVOICE_NO','DATE','GROSS','TDS','DEDUCTION','CASH_DISC','NET_AMT','STATUS'],
    ...transactions.map(t => [t.doc_no, t.doc_dt, t.inv_amt, t.tds, t.ded, t.disc, t.net, t.status]),
  ];
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `${header?.cust_name || 'export'}_transactions.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
