import React from 'react';
import { Check, X } from 'lucide-react';
import './ValidationTable.css';

const ConfidenceBar = ({ value }) => {
  const getColor = (v) => {
    if (v >= 90) return '#16a34a';
    if (v >= 75) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="confidence-cell">
      <div className="confidence-bar-track">
        <div
          className="confidence-bar-fill"
          style={{
            width: `${value}%`,
            background: getColor(value),
          }}
        />
      </div>
      <span className="confidence-label" style={{ color: getColor(value) }}>
        {value}%
      </span>
    </div>
  );
};

const ValidationTable = ({ fields, onApprove, onReject }) => {
  return (
    <div className="validation-table-wrap">
      <table className="validation-table">
        <thead>
          <tr>
            <th>FIELD ID</th>
            <th>VALUE</th>
            <th>CONFIDENCE</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <ValidationRow
              key={field.id}
              field={field}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ValidationRow = ({ field, onApprove, onReject }) => {
  const isApproved = field.status === 'approved';
  const isRejected = field.status === 'rejected';
  const isLowConfidence = field.confidence < 80;

  return (
    <tr className={`vt-row ${isRejected ? 'row-rejected' : ''}`}>
      <td className="field-id-cell">
        <span className="field-id-tag">{field.id}</span>
      </td>
      <td className="value-cell">
        <span className={isLowConfidence ? 'value-alert' : ''}>{field.value}</span>
      </td>
      <td>
        <ConfidenceBar value={field.confidence} />
      </td>
      <td className="status-cell">
        <div className="action-buttons">
          <button
            className={`action-btn approve-btn ${isApproved ? 'active-approve' : ''}`}
            onClick={() => onApprove(field.id)}
            title="Approve"
            aria-label={`Approve ${field.id}`}
          >
            <Check size={13} strokeWidth={2.5} />
          </button>
          <button
            className={`action-btn reject-btn ${isRejected ? 'active-reject' : ''}`}
            onClick={() => onReject(field.id)}
            title="Reject"
            aria-label={`Reject ${field.id}`}
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default ValidationTable;
