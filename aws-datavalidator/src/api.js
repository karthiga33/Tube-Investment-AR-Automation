const BASE = process.env.REACT_APP_API_URL || "http://ar-automation-main-server-1154735369.ap-south-1.elb.amazonaws.com";

const req = async (path, opts = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
};

export const api = {
  health:           ()        => req("/health"),
  dashboard:        ()        => req("/api/files/dashboard"),
  listOutput:       ()        => req("/api/files/output"),
  listApproved:     ()        => req("/api/files/approved"),
  listRejected:     ()        => req("/api/files/rejected"),
  listDeleted:      ()        => req("/api/files/deleted"),
  loadFile:         (key)     => req(`/api/file/load?key=${encodeURIComponent(key)}`),
  saveState:        (body)    => req("/api/file/save",    { method: "POST", body: JSON.stringify(body) }),
  approveFile:      (body)    => req("/api/file/approve", { method: "POST", body: JSON.stringify(body) }),
  rejectFile:       (body)    => req("/api/file/reject",  { method: "POST", body: JSON.stringify(body) }),
  deleteFile:       (key)     => req(`/api/file/delete?key=${encodeURIComponent(key)}`, { method: "POST" }),
  presignUrl:       (key)     => req(`/api/file/presign?key=${encodeURIComponent(key)}`),
  findInput:        (outKey)  => req(`/api/file/find-input?output_key=${encodeURIComponent(outKey)}`),
  docPreview:       (key)     => req(`/api/file/doc-preview?key=${encodeURIComponent(key)}`),
  viewUrl:          (key)     => `${BASE}/api/file/view?key=${encodeURIComponent(key)}`,

  // ── Multi-customer ────────────────────────────────────────────────────────
  listMultiOutput:          ()        => req("/api/files/multi-output"),
  multiLoadFile:            (key)     => req(`/api/file/multi-load?key=${encodeURIComponent(key)}`),
  multiApproveFile:         (body)    => req("/api/file/multi-approve",          { method: "POST", body: JSON.stringify(body) }),
  multiCustomerApprove:     (body)    => req("/api/file/multi-customer-approve", { method: "POST", body: JSON.stringify(body) }),
  multiRejectFile:          (body)    => req("/api/file/multi-reject",           { method: "POST", body: JSON.stringify(body) }),
  multiFindInput:           (outKey)  => req(`/api/file/multi-find-input?output_key=${encodeURIComponent(outKey)}`),

  // ── Rejected Emails ────────────────────────────────────────────────────────
  listRejectedEmails:       ()        => req("/api/rejected-emails"),
};
