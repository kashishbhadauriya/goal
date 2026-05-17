export const UOM_LABELS = {
  numeric_min: 'Numeric (Higher is Better)',
  numeric_max: 'Numeric (Lower is Better)',
  timeline: 'Timeline / Date',
  zero: 'Zero-Based',
};

export const UOM_SHORT = {
  numeric_min: 'Min↑',
  numeric_max: 'Max↓',
  timeline: 'Date',
  zero: 'Zero',
};

export const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  returned: 'Returned',
};

export const ACHIEVEMENT_STATUS = {
  not_started: 'Not Started',
  on_track: 'On Track',
  completed: 'Completed',
};

export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export const QUARTER_LABELS = {
  Q1: 'Q1 — July Check-in',
  Q2: 'Q2 — October Check-in',
  Q3: 'Q3 — January Check-in',
  Q4: 'Q4 — Annual Review',
};

export const scoreColor = (score) => {
  if (score >= 80) return 'var(--success)';
  if (score >= 50) return 'var(--accent)';
  return 'var(--danger)';
};

export const scoreBackground = (score) => {
  if (score >= 80) return 'var(--success-light)';
  if (score >= 50) return 'var(--accent-light)';
  return 'var(--danger-light)';
};

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(new Blob([blob]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const totalWeightage = (goals) =>
  goals.reduce((sum, g) => sum + (g.weightage || 0), 0);

export const getErrorMessage = (err) =>
  err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || err.message || 'An error occurred';
