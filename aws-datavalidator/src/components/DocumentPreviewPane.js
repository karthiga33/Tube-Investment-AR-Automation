import React, { useState, useEffect } from 'react';
import { Search, AlignLeft, ZoomIn, ZoomOut, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { api } from '../api';
import './DocumentPreviewPane.css';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'tiff', 'bmp', 'webp'];
const PDF_EXTS   = ['pdf'];
const HTML_EXTS  = ['html', 'htm'];
const TEXT_EXTS  = ['txt'];
const EXCEL_EXTS = ['xls', 'xlsx', 'xlsm', 'xlsb', 'csv'];
const DOC_EXTS   = ['doc', 'docx'];

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
        <p>Source file not found</p>
        <span>Showing extracted data only</span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   parseRemittanceText — parse "glued" remittance email bodies where the cell
   boundaries were lost during plain-text conversion.

   Each record follows this pattern:
     S|<docRefNumber>|<docNumber>|<invoiceType><Mon D, YYYY><amount>INR<withheld><paid>

   Example:
     S|3010010350667|271400008750|E-TDS-CM-1073219Jul 2, 2026-61.00INR.00-61.00
─────────────────────────────────────────────────────────────────────────────── */
function parseRemittanceText(text) {
  if (!text || text.indexOf('|') === -1) return null;

  // Strip a trailing "Total...." summary before splitting records, and capture it.
  // e.g. "...119,007.44Total.007,318,979.71"  →  total = "7,318,979.71"
  let body = text;
  let total = null;
  const totalMatch = body.match(/Total\.\d{2}([\d,]+\.\d{2})\s*$/);
  if (totalMatch) {
    total = totalMatch[1];
    body = body.slice(0, totalMatch.index);
  }

  // Each record starts with "S|". Split on that boundary while keeping the S.
  const chunks = body.split(/(?=S\|)/g).filter(c => c.trim().startsWith('S|'));
  if (chunks.length < 2) return null;

  // Trailing glued segment: <invoiceType><date><docAmount>INR<withheld=.00><paidAmount>
  //   - date        = "Mon D, YYYY"
  //   - docAmount   = signed number, greedy up to "INR"
  //   - withheld    = always ".00" or "0.00" in this format (anchored, non-greedy)
  //   - paidAmount  = the remaining signed number
  const MONTHS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
  const NUM = '-?[\\d,]+\\.\\d{2}';               // e.g. -61.00, 71,900.32
  const WITHHELD = '-?0?\\.\\d{2}';               // e.g. .00 or 0.00
  const tailRe = new RegExp(
    `^(.*?)((?:${MONTHS})\\s+\\d{1,2},\\s*\\d{4})(${NUM})(INR|USD|EUR|GBP)(${WITHHELD})(${NUM})$`
  );

  const rows = [];
  for (const chunk of chunks) {
    const parts = chunk.trim().split('|');
    if (parts.length < 4) continue;
    // parts[0] = "S", parts[1] = docRef, parts[2] = docNo, parts[3+] = glued tail
    const docRef = parts[1];
    const docNo  = parts[2];
    const tail   = parts.slice(3).join('|');

    const m = tail.match(tailRe);
    if (m) {
      rows.push([
        docRef,          // Document Reference Number
        docNo,           // Document Number
        m[1].trim(),     // Invoice Type / Reference
        m[2].trim(),     // Document Date
        m[3],            // Document Amount
        m[4],            // Currency
        m[5],            // Amount Withheld
        m[6],            // Amount Paid
      ]);
    } else {
      // Row didn't match the strict pattern — keep raw so nothing is lost
      rows.push([docRef, docNo, tail, '', '', '', '', '']);
    }
  }

  if (rows.length < 2) return null;

  const header = [
    'Document Reference Number',
    'Document Number',
    'Invoice Type',
    'Document Date',
    'Document Amount',
    'Currency',
    'Amount Withheld',
    'Amount Paid',
  ];

  return { rows: [header, ...rows], total };
}

/* ─────────────────────────────────────────────────────────────────────────────
   parseTextToTable — turn plain-text email body content into rows/columns.
   First tries the remittance-specific parser, then falls back to detecting the
   most likely column delimiter (tab, pipe, comma, or 2+ spaces).
   Returns { rows, total? } when tabular, or null otherwise.
─────────────────────────────────────────────────────────────────────────────── */
function parseTextToTable(text) {
  if (!text || !text.trim()) return null;

  // 1) Try the remittance-specific format first (glued single-line content).
  const remittance = parseRemittanceText(text);
  if (remittance) return remittance;

  // 2) Generic delimiter detection for well-separated text.
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(l => l.replace(/\s+$/g, ''))
    .filter(l => l.trim().length > 0);

  if (lines.length < 2) return null;

  const delimiters = [
    { name: 'tab',   split: (l) => l.split('\t') },
    { name: 'pipe',  split: (l) => l.split('|').map(c => c.trim()) },
    { name: 'comma', split: (l) => l.split(',').map(c => c.trim()) },
    { name: 'space', split: (l) => l.trim().split(/\s{2,}/) },
  ];

  for (const delim of delimiters) {
    const rows = lines.map(delim.split);
    const colCounts = rows.map(r => r.length);
    const maxCols = Math.max(...colCounts);

    if (maxCols < 2) continue;

    const consistent = colCounts.filter(c => c === maxCols).length;
    if (consistent >= Math.ceil(lines.length * 0.6)) {
      const normalized = rows.map(r => {
        const copy = [...r];
        while (copy.length < maxCols) copy.push('');
        return copy.slice(0, maxCols);
      });
      return { rows: normalized };
    }
  }

  return null;
}

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
  const [docHtml, setDocHtml] = useState('');
  const [docLoading, setDocLoading] = useState(false);

  const ext = (inputExt || '').toLowerCase();
  const isPdf   = PDF_EXTS.includes(ext);
  const isImage = IMAGE_EXTS.includes(ext);
  const isHtml  = HTML_EXTS.includes(ext);
  const isTxt   = TEXT_EXTS.includes(ext);
  const isExcel = EXCEL_EXTS.includes(ext);
  const isDoc   = DOC_EXTS.includes(ext);
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
            sheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' });
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

  // Fetch and convert DOC/DOCX to HTML using mammoth (client) or backend API
  useEffect(() => {
    if (isDoc && hasUrl) {
      setDocLoading(true);
      fetch(previewUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => {
          // Try mammoth for .docx files
          if (ext === 'docx') {
            return mammoth.convertToHtml({ arrayBuffer: buffer }).then(result => {
              if (result.value && result.value.trim().length > 10) {
                setDocHtml(result.value);
                setDocLoading(false);
              } else {
                throw new Error('Empty result');
              }
            });
          } else {
            throw new Error('Not docx — use backend');
          }
        })
        .catch(() => {
          // Fallback: use backend doc-preview API
          // We need the S3 key — extract from the previewUrl or use inputFile key
          // The previewUrl contains the key as a query param
          try {
            const urlObj = new URL(previewUrl);
            const key = urlObj.searchParams.get('key');
            if (key) {
              api.docPreview(key)
                .then(data => {
                  setDocHtml(data.html || '');
                  setDocLoading(false);
                })
                .catch(() => {
                  setDocHtml('');
                  setDocLoading(false);
                });
            } else {
              setDocHtml('');
              setDocLoading(false);
            }
          } catch {
            setDocHtml('');
            setDocLoading(false);
          }
        });
    }
  }, [isDoc, hasUrl, previewUrl, ext]);

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
            style={{ height: `${100 * zoom}%`, minHeight: `${100 * zoom}%` }}
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

        {/* TXT — rendered as a structured table when tabular, else preformatted text.
            The "Text" toolbar mode forces the raw view. */}
        {isTxt && hasUrl && (() => {
          const parsed = viewMode === 'text' ? null : parseTextToTable(txtContent);
          return (
            <div className="preview-txt-wrapper" style={{ zoom: zoom }}>
              {txtLoading ? (
                <p className="preview-txt-loading">Loading text file…</p>
              ) : parsed ? (
                <div className="excel-table-scroll">
                  <table className="excel-table">
                    <tbody>
                      {parsed.rows.map((row, ri) => (
                        <tr key={ri} className={ri === 0 ? 'excel-header-row' : ''}>
                          {row.map((cell, ci) => (
                            ri === 0
                              ? <th key={ci}>{cell}</th>
                              : <td key={ci}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                      {parsed.total && (
                        <tr className="excel-total-row">
                          <td colSpan={(parsed.rows[0] || []).length - 1} style={{ textAlign: 'right', fontWeight: 700 }}>
                            Total
                          </td>
                          <td style={{ fontWeight: 700 }}>{parsed.total}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <pre className="preview-txt">{txtContent}</pre>
              )}
            </div>
          );
        })()}

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

        {/* DOC/DOCX — rendered as HTML via mammoth */}
        {isDoc && hasUrl && (
          <div className="preview-doc-wrapper" style={{ zoom: zoom }}>
            {docLoading ? (
              <p className="preview-txt-loading">Loading document…</p>
            ) : docHtml ? (
              <div className="preview-doc-content" dangerouslySetInnerHTML={{ __html: docHtml }} />
            ) : (
              <PaymentAdviceDoc header={header} />
            )}
          </div>
        )}

        {/* No recognized format, or URL missing → structured payment advice */}
        {((!isPdf && !isImage && !isHtml && !isTxt && !isExcel && !isDoc) ||
          (isPdf && !hasUrl) ||
          (isImage && (!hasUrl || imgError)) ||
          (isHtml && !hasUrl) ||
          (isTxt && !hasUrl) ||
          (isExcel && !hasUrl) ||
          (isDoc && !hasUrl)) && (
          <div style={{ zoom: zoom, flex: 1, overflow: 'auto' }}>
            <PaymentAdviceDoc header={header} />
          </div>
        )}
      </div>
    </div>
  );
}
