import React, { useRef, useState } from 'react';
import { Upload, AlignLeft, Search } from 'lucide-react';
import './PDFViewer.css';

/* Faithful recreation of the MSL Driveline payment advice document */
const MockDocument = () => (
  <div className="mock-doc">
    <div className="doc-company-header">
      <strong>MSL DRIVELINE SYSTEMS LIMITED</strong>
      <p>PLOT NO. B9/1A,</p>
      <p>MIDC, SATPUR,</p>
      <p>NASHIK - 422007</p>
      <p><strong>RTGS</strong></p>
    </div>

    <div className="doc-title">PAYMENT ADVICE</div>
    <div className="doc-divider" />

    <div className="doc-fields">
      <div className="doc-field-row">
        <span className="doc-field-label">Date:</span>
        <span className="doc-field-value">30 Apr 2026</span>
      </div>
      <div className="doc-field-row">
        <span className="doc-field-label">Customer Reference No:</span>
        <span className="doc-field-value" />
      </div>
      <div className="doc-field-row">
        <span className="doc-field-label">Beneficiary Account No:</span>
        <span className="doc-field-value">TP**********</span>
      </div>
      <div className="doc-field-row">
        <span className="doc-field-label">Beneficiary IFSC Code:</span>
        <span className="doc-field-value">HDFC0000004</span>
      </div>
      <div className="doc-field-row">
        <span className="doc-field-label">Product:</span>
        <span className="doc-field-value">RTGS</span>
      </div>
      <div className="doc-field-row">
        <span className="doc-field-label">Beneficiary Name:</span>
        <span className="doc-field-value">TUBE INVESTMENTS OF INDIA LIMITED</span>
      </div>
      <div className="doc-field-row">
        <span className="doc-field-label">UTR Number:</span>
        <span className="doc-field-value">CITIH26120705627</span>
      </div>
      <div className="doc-field-row">
        <span className="doc-field-label">Amount:</span>
        <span className="doc-field-value">3,791,007.52</span>
      </div>
      <div className="doc-field-row">
        <span className="doc-field-label">Payment Remark:</span>
        <span className="doc-field-value" />
      </div>
    </div>

    {/* Bill table */}
    <div className="doc-bill-table">
      <table>
        <thead>
          <tr>
            <th>Bank Document Number</th>
            <th>Bill Number</th>
            <th>Bill Date</th>
            <th>Bill Amount</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['NBVNC27000036', '30520100010021', '28032026', '824'],
            ['NBVNC27000036', '30520100010021', '28032026', '97,5629.92'],
            ['NBVNC27000036', '30520100010040', '29032026', ''],
            ['NBVNC27000036', '30520100010039', '29032026', '7720.78'],
            ['NBVNC27000036', '30520100010039', '29032026', '698'],
            ['NBVNC27000036', '30520100010039', '29032026', '87,5155.58'],
          ].map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => <td key={j}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const PDFViewer = ({ pdfFile, zoom, onFileUpload }) => {
  const fileInputRef = useRef(null);
  const [viewMode, setViewMode] = useState('document'); // 'text' | 'document'

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') onFileUpload(file);
  };

  return (
    <div className="pdf-viewer-outer">
      {/* PDF toolbar */}
      <div className="pdf-toolbar">
        <div className="pdf-toolbar-left">
          <button className="pdf-tool" title="Toggle sidebar">
            <AlignLeft size={14} />
          </button>
          <button className="pdf-tool" title="More options">···</button>
        </div>
        <div className="pdf-toolbar-center">
          <button className="pdf-tool">−</button>
          <button className="pdf-tool">+</button>
          <span className="page-indicator">1 of 1</span>
          <button className="pdf-tool">···</button>
        </div>
        <div className="pdf-toolbar-right">
          <button className="pdf-tool" title="Search"><Search size={13} /></button>
          <button className="pdf-tool" title="More">···</button>
          <button
            className={`view-mode-btn ${viewMode === 'text' ? 'active' : ''}`}
            onClick={() => setViewMode('text')}
          >Text</button>
          <button
            className={`view-mode-btn ${viewMode === 'document' ? 'active' : ''}`}
            onClick={() => setViewMode('document')}
          >Document</button>
        </div>
      </div>

      {/* PDF content area */}
      <div
        className="pdf-content-area"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div
          className="pdf-page-wrap"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        >
          {pdfFile
            ? <div className="pdf-filename-msg">📄 {pdfFile.name}</div>
            : <MockDocument />
          }
        </div>

        {/* Upload button */}
        <div
          className="upload-trigger"
          onClick={() => fileInputRef.current?.click()}
          title="Upload a PDF"
        >
          <Upload size={12} />
          <span>Upload PDF</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files[0] && onFileUpload(e.target.files[0])}
        />
      </div>
    </div>
  );
};

export default PDFViewer;
