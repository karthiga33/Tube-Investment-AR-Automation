import React, { useState, useEffect } from 'react';
import { Search, AlignLeft, ZoomIn, ZoomOut, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import './DocumentPreviewPane.css';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'tiff', 'bmp', 'webp'];
const PDF_EXTS   = ['pdf'];
const HTML_EXTS  = ['html', 'htm'];
const TEXT_EXTS  = ['txt'];
const EXCEL_EXTS = ['xls', 'xlsx', 'xlsm', 'xlsb', 'csv'];

/* ─────────────────────────────────────────────────────────────────────────────
   PaymentAdviceDoc — rendered when no source file is available.
   Shows the extracted header data in a styled payment-advice layout.
─────────────────────────────────────────────────────────────────────────────── */
const PaymentAdviceDoc = ({ header }) => {
  if (!header) return null;
  const fmt = (v) =>
    v != null && v !== '' ? String(v) : '—';
  const fmtAmt = (v) =>
    v ? Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—';

  return (
    <div className="pa-doc">
      <div className="pa-company">{fmt(header.cust_name)}</div>
      <div className="pa-title">PAYMENT ADVICE</div>
      <div className="pa-divider" />

      <div className="pa-fields">
        <div className="pa-row"><span className="pa-label">UTR Number</span>   <span className="pa-value">{fmt(header.utr)}</span></div>
        <div className="pa-row"><span className="pa-label">Payment Date</span> <span className="pa-value">{fmt(header.pay_dt)}</span></div>
        <div className="pa-row"><span className="pa-label">Pay Amount</span>   <span className="pa-value pa-amount">₹ {fmtAmt(header.pay_amt)}</span></div>
        <div className="pa-row"><span className="pa-label">Customer</span>     <span className="pa-value">{fmt(header.cust_name)}</span></div>
        <div className="pa-row"><span className="pa-label">Source</span>       <span className="pa-value">{fmt(header.src) || 'PDF'}</span></div>
        {header.cust_code && (
          <div className="pa-row"><span className="pa-label">Customer Code</span><span className="pa-value">{header.cust_code}</span></div>
        )}
        {header.mail_id && (
          <div className="pa-row"><span className="pa-label">Mail ID</span><span className="pa-value">{header.mail_id}</span></div>
        )}
      </div>

      <div className="pa-no-source">
        <span>📎</span>
        <p>Source file not in emails/ folder</p>
        <span>Showing extracted data only</span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Main component
─────────────────────────────────────────────────────────────────────────────── */
export default function DocumentPreviewPane({ fileName, previewUrl, inputExt, header }) {
  const [zoom,     setZoom]     = useState(1.0);
  const [viewMode, setViewMode] = useState('document');
  const [imgError, setImgError] = useState(false);
  const [txtContent, setTxtContent] = useState('');
  const [txtLoading, setTxtLoading] = useState(false);
  const [excelData, setExcelData] = useState(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelSheets, setExcelSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState('');

  const ext = (inputExt || '').toLowerCase();
  const isPdf   = PDF_EXTS.includes(ext);
  const isImage = IMAGE_EXTS.includes(ext);
  const isHtml  = HTML_EXTS.includes(ext);
  const isTxt   = TEXT_EXTS.includes(ext);
  const isExcel = EXCEL_EXTS.includes(ext);
  const hasUrl  = Boolean(previewUrl);

  // Fetch .txt file content when it's a text file
  useEffect(() => {
    if (isTxt && hasUrl) {
      setTxtLoading(true);
      fetch(previewUrl)
        .then(res => res.text())
        .then(text => { setTxtContent(text); setTxtLoading(false); })
        .catch(() => { setTxtContent('Failed to load text file.'); setTxtLoading(false); });
    }
  }, [isTxt, hasUrl, previewUrl]);

  // Fetch and parse Excel file
  useEffect(() => {
    if (isExcel && hasUrl) {
      setExcelLoading(true);
      fetch(previewUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => {
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheets = {};
          workbook.SheetNames.forEach(name => {
            sheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 });
          });
          setExcelData(sheets);
          setExcelSheets(workbook.SheetNames);
          setActiveSheet(workbook.SheetNames[0] || '');
          setExcelLoading(false);
        })
        .catch(() => {
          setExcelData(null);
          setExcelLoading(false);
        });
    }
  }, [isExcel, hasUrl, previewUrl]);

  return (
    <div className="preview-pane">

      {/* ── Toolbar ── */}
      <div className="preview-toolbar">
        <div className="pt-left">
          <button className="pt-btn" title="Sidebar"><AlignLeft size={13} /></button>
        </div>
        <div className="pt-center">
          <button className="pt-btn" onClick={() => setZoom(z => Math.max(0.4, +(z - 0.15).toFixed(2)))} title="Zoom out">
            <ZoomOut size={13} />
          </button>
          <span className="pt-zoom">{Math.round(zoom * 100)}%</span>
          <button className="pt-btn" onClick={() => setZoom(z => Math.min(3.0, +(z + 0.15).toFixed(2)))} title="Zoom in">
            <ZoomIn size={13} />
          </button>
          <span className="pt-sep" />
          <span className="pt-page">1 of 1</span>
        </div>
        <div className="pt-right">
          <button className="pt-btn" title="Search"><Search size={12} /></button>
          <button className="pt-btn" title="Print" onClick={() => window.print()}><Printer size={12} /></button>
          <button className={`pt-mode ${viewMode === 'text'     ? 'active' : ''}`} onClick={() => setViewMode('text')}>Text</button>
          <button className={`pt-mode ${viewMode === 'document' ? 'active' : ''}`} onClick={() => setViewMode('document')}>Document</button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="preview-content">
        {/* PDF via presigned URL → fills full pane, zoom via CSS zoom */}
        {isPdf && hasUrl && (
          <iframe
            src={`${previewUrl}#toolbar=1&view=FitH&scrollbar=1`}
            title={fileName}
            className="preview-iframe"
            style={{ zoom: zoom }}
          />
        )}

        {/* Image via presigned URL */}
        {isImage && hasUrl && !imgError && (
          <img
            src={previewUrl}
            alt={fileName}
            className="preview-image"
            style={{ zoom: zoom }}
            onError={() => setImgError(true)}
          />
        )}

        {/* HTML via iframe with sandbox */}
        {isHtml && hasUrl && (
          <iframe
            src={previewUrl}
            title={fileName}
            className="preview-iframe"
            style={{ zoom: zoom }}
            sandbox="allow-same-origin"
          />
        )}

        {/* TXT — rendered as preformatted text */}
        {isTxt && hasUrl && (
          <div className="preview-txt-wrapper" style={{ zoom: zoom }}>
            {txtLoading ? (
              <p className="preview-txt-loading">Loading text file…</p>
            ) : (
              <pre className="preview-txt">{txtContent}</pre>
            )}
          </div>
        )}

        {/* Excel — rendered as HTML table */}
        {isExcel && hasUrl && (
          <div className="preview-excel-wrapper" style={{ zoom: zoom }}>
            {excelLoading ? (
              <p className="preview-txt-loading">Loading spreadsheet…</p>
            ) : excelData && activeSheet ? (
              <>
                {excelSheets.length > 1 && (
                  <div className="excel-sheet-tabs">
                    {excelSheets.map(name => (
                      <button
                        key={name}
                        className={`excel-tab ${name === activeSheet ? 'active' : ''}`}
                        onClick={() => setActiveSheet(name)}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="excel-table-scroll">
                  <table className="excel-table">
                    <tbody>
                      {(excelData[activeSheet] || []).map((row, ri) => (
                        <tr key={ri} className={ri === 0 ? 'excel-header-row' : ''}>
                          {(row || []).map((cell, ci) => (
                            ri === 0
                              ? <th key={ci}>{cell != null ? String(cell) : ''}</th>
                              : <td key={ci}>{cell != null ? String(cell) : ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="preview-txt-loading">Unable to parse spreadsheet.</p>
            )}
          </div>
        )}

        {/* No recognized format, or URL missing → structured payment advice */}
        {((!isPdf && !isImage && !isHtml && !isTxt && !isExcel) ||
          (isPdf && !hasUrl) ||
          (isImage && (!hasUrl || imgError)) ||
          (isHtml && !hasUrl) ||
          (isTxt && !hasUrl) ||
          (isExcel && !hasUrl)) && (
          <div style={{ zoom: zoom, flex: 1, overflow: 'auto' }}>
            <PaymentAdviceDoc header={header} />
          </div>
        )}
      </div>
    </div>
  );
}
