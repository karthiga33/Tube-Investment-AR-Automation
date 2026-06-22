import React, { useState, useRef, useEffect } from 'react';
import { Download, Plus, Check, X, CheckSquare, XSquare, Pencil } from 'lucide-react';
import './ExtractedDataPanel.css';

/* ─── Inline editable cell (TD) ─────────────────────────────────────────────── */
function EditableCell({ value, onSave, numeric, className }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');
  const ref = useRef(null);

  const canEdit = Boolean(onSave);
  const start = (e) => { if (!canEdit) return; e.stopPropagation(); setDraft(String(value ?? '')); setEditing(true); };
  const commit = () => {
    setEditing(false);
    const v = draft.trim();
    if (v !== String(value ?? '') && onSave) onSave(numeric ? (parseFloat(v) || 0) : v);
  };
  const cancel = () => setEditing(false);

  useEffect(() => { if (editing) ref.current?.select(); }, [editing]);

  const display = numeric && value != null && value !== '' && Number(value) !== 0
    ? Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    : (value || '—');

  if (editing) {
    return (
      <td className={`ec editing ${className || ''}`}>
        <input
          ref={ref}
          className="ec-input"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
        />
      </td>
    );
  }
  return (
    <td className={`ec ${canEdit ? '' : 'ec-readonly'} ${className || ''}`} onClick={start} title={canEdit ? "Click to edit" : ""}>
      <span className="ec-text">{display}</span>
      {canEdit && <Pencil size={10} className="ec-icon" />}
    </td>
  );
}

/* ─── Editable header field (DIV) ──────────────────────────────────────────── */
function EditableHeaderCol({ label, value, onSave, mono, numeric }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');
  const ref = useRef(null);

  const canEdit = Boolean(onSave);
  const start = () => { if (!canEdit) return; setDraft(String(value ?? '')); setEditing(true); };
  const commit = () => {
    setEditing(false);
    const v = draft.trim();
    if (v !== String(value ?? '') && onSave) onSave(numeric ? (parseFloat(v) || 0) : v);
  };
  const cancel = () => setEditing(false);
  useEffect(() => { if (editing) ref.current?.select(); }, [editing]);

  const display = numeric && value != null && Number(value) !== 0
    ? `₹ ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    : (value || '—');

  return (
    <div className={`ph-col ${canEdit ? '' : 'ph-col-readonly'}`} onClick={!editing ? start : undefined} title={canEdit ? "Click to edit" : ""}>
      <div className="ph-col-label">
        {label}
        {canEdit && <Pencil size={9} className="ph-pencil" />}
      </div>
      {editing ? (
        <input
          ref={ref}
          className="ph-input"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
        />
      ) : (
        <div className={`ph-col-value${mono ? ' mono' : ''}`}>{display}</div>
      )}
    </div>
  );
}

/* ─── Main panel ────────────────────────────────────────────────────────────── */
export default function ExtractedDataPanel({
  header = {},
  transactions = [],
  onTransactionChange,
  onHeaderChange,
  onExportExcel,
  readOnly = false,
}) {
  // Track bulk-select state: null | 'approved' | 'rejected'
  const [bulkState, setBulkState] = useState(null);

  const updateHeader = (field, val) => {
    if (onHeaderChange) onHeaderChange({ ...header, [field]: val });
  };

  const setStatus = (id, newStatus) => {
    onTransactionChange(transactions.map(t => t._id === id ? { ...t, status: newStatus } : t));
  };

  const updateCell = (id, field, val) => {
    onTransactionChange(transactions.map(t => t._id === id ? { ...t, [field]: val } : t));
  };

  // Toggle: if already in that bulkState → reset to pending; else apply
  const handleSelectAll = () => {
    if (bulkState === 'approved') {
      setBulkState(null);
      onTransactionChange(transactions.map(t => ({ ...t, status: 'pending' })));
    } else {
      setBulkState('approved');
      onTransactionChange(transactions.map(t => ({ ...t, status: 'approved' })));
    }
  };

  const handleRejectAll = () => {
    if (bulkState === 'rejected') {
      setBulkState(null);
      onTransactionChange(transactions.map(t => ({ ...t, status: 'pending' })));
    } else {
      setBulkState('rejected');
      onTransactionChange(transactions.map(t => ({ ...t, status: 'rejected' })));
    }
  };

  const handleRowStatus = (id, status) => {
    setBulkState(null);
    setStatus(id, status);
  };

  const addRow = () => {
    const maxId = transactions.reduce((m, t) => Math.max(m, t._id || 0), 0);
    onTransactionChange([...transactions, {
      _id: maxId + 1, doc_no: '', doc_dt: '', inv_amt: 0,
      tds: 0, ded: 0, disc: 0, net: 0, status: 'pending',
    }]);
  };

  return (
    <div className="extracted-panel">

      {/* ── Top bar ── */}
      <div className="ep-header">
        <span className="ep-title">EXTRACTED DATA</span>
        <button className="btn-export-excel" onClick={onExportExcel}>
          <Download size={12} /> Export Excel
        </button>
      </div>

      <div className="ep-body">

        {/* ── Block 1: Payment Header ── */}
        <div className="ep-block">
          <div className="ep-block-label">PAYMENT HEADER</div>
          {/* Row 1 — core fields */}
          <div className="ph-grid ph-grid-4">
            <EditableHeaderCol label="VENDOR NAME"    value={header.cust_name}  onSave={readOnly ? null : v => updateHeader('cust_name', v)} />
            <EditableHeaderCol label="PAY DATE"       value={header.pay_dt}     onSave={readOnly ? null : v => updateHeader('pay_dt', v)} />
            <EditableHeaderCol label="PAY AMOUNT"     value={header.pay_amt}    onSave={readOnly ? null : v => updateHeader('pay_amt', v)} numeric />
            <EditableHeaderCol label="UTR REFERENCE"  value={header.utr}        onSave={readOnly ? null : v => updateHeader('utr', v)} mono />
          </div>
          {/* Row 2 — extended fields */}
          <div className="ph-grid ph-grid-4 ph-grid-border">
            <EditableHeaderCol label="SOURCE TYPE"    value={header.src}              onSave={readOnly ? null : v => updateHeader('src', v)} />
            <EditableHeaderCol label="CUST CODE"      value={header.cust_code}        onSave={readOnly ? null : v => updateHeader('cust_code', v)} mono />
            <EditableHeaderCol label="IMPORT REF"     value={header.import_ref}       onSave={readOnly ? null : v => updateHeader('import_ref', v)} mono />
            <EditableHeaderCol label="CUST PAYMENT ID" value={header.cust_payment_id} onSave={readOnly ? null : v => updateHeader('cust_payment_id', v)} mono />
          </div>
          {/* Row 3 — mail fields */}
          <div className="ph-grid ph-grid-3 ph-grid-border">
            <EditableHeaderCol label="MAIL ID"           value={header.mail_id}  onSave={readOnly ? null : v => updateHeader('mail_id', v)} />
            <EditableHeaderCol label="MAIL RECEIVED DATE" value={header.mail_dt} onSave={readOnly ? null : v => updateHeader('mail_dt', v)} />
          </div>
        </div>

        {/* ── Block 2: Transactions ── */}
        <div className="ep-block ep-block-grow">
          <div className="ep-block-label-row">
            <span className="ep-block-label-text">TRANSACTIONS ({transactions.length})</span>
            {!readOnly && (
              <div className="bulk-actions">
                <button
                  className={`bulk-btn select-all ${bulkState === 'approved' ? 'bulk-active' : ''}`}
                  onClick={handleSelectAll}
                  title={bulkState === 'approved' ? 'Click to unselect all' : 'Approve all rows'}
                >
                  <CheckSquare size={13} />
                  {bulkState === 'approved' ? 'Unselect All' : 'Select All'}
                </button>
                <button
                  className={`bulk-btn reject-all ${bulkState === 'rejected' ? 'bulk-active' : ''}`}
                  onClick={handleRejectAll}
                  title={bulkState === 'rejected' ? 'Click to unselect all' : 'Reject all rows'}
                >
                  <XSquare size={13} />
                  {bulkState === 'rejected' ? 'Unselect All' : 'Reject All'}
                </button>
              </div>
            )}
          </div>

          <div className="tx-scroll">
            <table className="tx-table">
              <thead>
                <tr>
                  <th className="th-num">#</th>
                  <th>INVOICE #</th>
                  <th>DATE</th>
                  <th className="num">GROSS</th>
                  <th className="num">DEDUCTION</th>
                  <th className="num">TDS</th>
                  <th className="num">CASH DISC.</th>
                  <th className="num">NET AMT</th>
                  <th className="th-status">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((row, idx) => (
                  <TxRow
                    key={row._id}
                    row={row}
                    idx={idx + 1}
                    onApprove={readOnly ? null : () => handleRowStatus(row._id, row.status === 'approved' ? 'pending' : 'approved')}
                    onReject={readOnly ? null : ()  => handleRowStatus(row._id, row.status === 'rejected' ? 'pending' : 'rejected')}
                    onUpdate={readOnly ? null : (field, val) => updateCell(row._id, field, val)}
                    readOnly={readOnly}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {!readOnly && (
            <button className="btn-add-tx" onClick={addRow}>
              <Plus size={12} /> Add Transaction
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Transaction row ────────────────────────────────────────────────────────── */
function TxRow({ row, idx, onApprove, onReject, onUpdate, readOnly }) {
  const approved = row.status === 'approved';
  const rejected = row.status === 'rejected';

  return (
    <tr className={`tx-row ${rejected ? 'row-rej' : approved ? 'row-app' : ''}`}>
      <td className="td-num">{idx}</td>

      <EditableCell value={row.doc_no}  onSave={readOnly ? null : v => onUpdate('doc_no', v)}  className="td-inv"  />
      <EditableCell value={row.doc_dt}  onSave={readOnly ? null : v => onUpdate('doc_dt', v)}  className="td-date" />
      <EditableCell value={row.inv_amt} onSave={readOnly ? null : v => onUpdate('inv_amt', v)} numeric className="num" />
      <EditableCell value={row.ded}     onSave={readOnly ? null : v => onUpdate('ded', v)}     numeric className="num" />
      <EditableCell value={row.tds}     onSave={readOnly ? null : v => onUpdate('tds', v)}     numeric className="num" />
      <EditableCell value={row.disc}    onSave={readOnly ? null : v => onUpdate('disc', v)}    numeric className="num" />
      <EditableCell value={row.net}     onSave={readOnly ? null : v => onUpdate('net', v)}     numeric className="num net" />

      <td className="td-status">
        {!readOnly ? (
          <div className="tx-actions">
            <button
              className={`tx-btn approve ${approved ? 'on' : ''}`}
              onClick={onApprove}
              title={approved ? 'Click to unselect' : 'Approve'}
              aria-label={`Approve row ${idx}`}
            ><Check size={11} strokeWidth={2.5} /></button>
            <button
              className={`tx-btn reject ${rejected ? 'on' : ''}`}
              onClick={onReject}
              title={rejected ? 'Click to unselect' : 'Reject'}
              aria-label={`Reject row ${idx}`}
            ><X size={11} strokeWidth={2.5} /></button>
          </div>
        ) : (
          <span className={`status-label ${approved ? 'sl-app' : rejected ? 'sl-rej' : ''}`}>
            {approved ? '✓' : rejected ? '✗' : '—'}
          </span>
        )}
      </td>
    </tr>
  );
}
