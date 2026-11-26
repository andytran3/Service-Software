import type { RequestStatus } from '../types';

const statusStyles: Record<RequestStatus, string> = {
  New: 'bg-blue-50 text-blue-800 ring-blue-200',
  'In Progress': 'bg-amber-50 text-amber-900 ring-amber-200',
  Completed: 'bg-green-50 text-green-800 ring-green-200',
};

/** Shows the status as text; colour is only a supplementary cue. */
export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
