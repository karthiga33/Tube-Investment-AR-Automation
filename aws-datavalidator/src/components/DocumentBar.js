import React from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import './DocumentBar.css';

const DocumentBar = ({ approvedCount, rejectedCount, pendingCount, onApprove, onReject }) => {
  return (
    <div className="document-bar">
      <div className="doc-bar-left">
        <button className="nav-arrow"><ChevronLeft size={15} /></button>
        <button className="nav-arrow"><ChevronRight size={15} /></button>

        <div className="doc-filename">
          <span className="pdf-icon">📄</span>
          <span className="filename-text">MSL DRIVELINE (TDS IN SEPARATE ROW).pdf</span>
          <span className="doc-count">#52</span>
        </div>

        <div className="doc-separator" />

        <div className="company-name">
          <span className="lock-icon">🔒</span>
          <strong>MSL DRIVELINE SYSTEMS LIMITED</strong>
        </div>

        <button className="btn-ai-guide">
          <Sparkles size={12} />
          AI Guide
          <span className="ai-badge">✦</span>
        </button>
      </div>

      <div className="doc-bar-right">
        <span className="count-badge approved-badge">
          {approvedCount} APPROVED
        </span>
        <span className="count-badge rejected-badge">
          {rejectedCount} REJECTED
        </span>
        <span className="count-badge pending-badge">
          {pendingCount} PENDING
        </span>
        <button className="btn-reject" onClick={onReject}>Reject</button>
        <button className="btn-approve" onClick={onApprove}>Approve</button>
      </div>
    </div>
  );
};

export default DocumentBar;
