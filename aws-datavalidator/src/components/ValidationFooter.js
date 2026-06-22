import React from 'react';
import './ValidationFooter.css';

const ValidationFooter = ({
  approvedCount,
  rejectedCount,
  pendingCount,
  flagCount,
  total,
}) => {
  return (
    <div className="validation-footer">
      <div className="footer-progress">
        <div className="progress-dots">
          {Array.from({ length: total }).map((_, i) => {
            const field_index = i;
            const isApproved = field_index < approvedCount;
            const isRejected = !isApproved && field_index < approvedCount + rejectedCount;
            return (
              <span
                key={i}
                className={`progress-dot ${
                  isApproved ? 'dot-approved' :
                  isRejected ? 'dot-rejected' :
                  'dot-pending'
                }`}
              />
            );
          })}
        </div>
        <span className="progress-label">VALIDATION PROGRESS</span>
        <div className="progress-stats">
          <span className="stat approved">{approvedCount} approved</span>
          <span className="stat rejected">{rejectedCount} rejected</span>
          {pendingCount > 0 && (
            <span className="stat pending">{pendingCount} pending</span>
          )}
        </div>
      </div>

      <button className="btn-review-flags" disabled={flagCount === 0}>
        Review Flags ({flagCount})
      </button>
    </div>
  );
};

export default ValidationFooter;
