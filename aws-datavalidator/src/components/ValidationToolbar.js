import React from 'react';
import { Download, CheckCircle, XCircle } from 'lucide-react';
import './ValidationToolbar.css';

const ValidationToolbar = ({
  onApproveAll,
  onRejectAll,
  onSyncToS3,
  onExportCSV,
  syncing,
  syncStatus,
}) => {
  return (
    <div className="validation-toolbar">
      <div className="toolbar-left">
        <span className="toolbar-title">Validation Toolbar</span>
        <button className="btn-approve-all" onClick={onApproveAll}>
          <CheckCircle size={14} />
          Approve All
        </button>
        <button className="btn-reject-all" onClick={onRejectAll}>
          <XCircle size={14} />
          Reject All
        </button>
      </div>

      <div className="toolbar-right">
        <span className="doc-label">DOCUMENT: INV-2024-0042.PDF</span>
        <button className="btn-export-csv" onClick={onExportCSV}>
          <Download size={13} />
          Export CSV
        </button>
        {syncStatus === 'success' && (
          <span className="sync-feedback success">✓ Synced to S3</span>
        )}
        {syncStatus === 'error' && (
          <span className="sync-feedback error">✗ Sync failed</span>
        )}
      </div>
    </div>
  );
};

export default ValidationToolbar;
