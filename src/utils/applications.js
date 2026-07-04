const STATUS_FLOW = ['Not Applied', 'Applied', 'OA', 'Phone Screen', 'Interview', 'Offer'];

function norm(value) {
  return (value ?? '').toString().trim().toLowerCase();
}

function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function parseDate(date) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function advanceStatus(status) {
  const index = STATUS_FLOW.indexOf(status);
  if (index === -1 || index === STATUS_FLOW.length - 1) return status;
  return STATUS_FLOW[index + 1];
}

export function validateApplication(entry, existingApplications, editingIndex) {
  const errors = [];
  const company = (entry.company ?? '').trim();
  const role = (entry.role ?? '').trim();
  const applied = (entry.applied ?? '').trim();
  const active = entry.status && entry.status !== 'Not Applied';

  if (!company) errors.push('Company name is required.');
  if (!role) errors.push('Role is required.');
  if (active && !applied) errors.push('Applied date is required once an application is active.');

  const duplicate = existingApplications?.some((app, index) => {
    if (editingIndex !== null && index === editingIndex) return false;
    return norm(app.company) === norm(company) && norm(app.role) === norm(role);
  });

  if (company && role && duplicate) errors.push('An application for this company and role already exists.');

  return { ok: errors.length === 0, errors };
}

export function formatRelativeStamp(updatedAt, now = new Date()) {
  const updated = parseDate(updatedAt);
  if (!updated) return '';

  const today = dayKey(now);
  const updatedDay = dayKey(updated);
  if (today === updatedDay) return 'Updated today';

  const diffDays = Math.max(1, Math.floor((new Date(dayKey(now)) - new Date(updatedDay)) / (24 * 60 * 60 * 1000)));
  if (diffDays < 7) return `Updated ${diffDays}d ago`;

  return `Updated ${updated.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export function getDeadlineState(nextActionDue, now = new Date()) {
  const due = parseDate(nextActionDue);
  if (!due) return null;

  const dueDay = new Date(dayKey(due));
  const today = new Date(dayKey(now));
  const diffDays = Math.floor((dueDay - today) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    return { tone: 'overdue', label: `Overdue ${Math.abs(diffDays)}d` };
  }

  if (diffDays <= 2) {
    return { tone: 'soon', label: diffDays === 0 ? 'Due today' : `Due in ${diffDays}d` };
  }

  return { tone: 'neutral', label: `Due ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` };
}

export function getEmptyStateCopy(activeFilterLabel) {
  if (!activeFilterLabel) {
    return {
      title: 'Board clear',
      body: 'No applications logged. Press "+ New Entry" to start tracking.',
      actionLabel: null,
    };
  }

  const label = activeFilterLabel.toLowerCase();
  return {
    title: `No ${label} applications yet`,
    body: 'Clear the filter or add the next application to keep moving.',
    actionLabel: 'Clear filter',
  };
}
