import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { focusRing, textLink } from '../../../app/styles';
import { ErrorState } from '../components/ErrorState';
import { SearchForm } from '../components/SearchForm';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime, formatRelativeTime } from '../format';
import { useRequests } from '../hooks';
import { summarizeRequests } from '../requestSummary';
import {
  isRequestStatus,
  REQUEST_STATUSES,
  type InternalRequest,
  type RequestStatus,
} from '../types';

/** The active search and status filter, as described in sentences and the table caption. */
interface ListFilter {
  q: string;
  status: RequestStatus | null;
}

function filterSuffix({ q, status }: ListFilter): string {
  return [q ? `“${q}”` : null, status ? `with status “${status}”` : null].filter(Boolean).join(' ');
}

function matchSummary(count: number, filter: ListFilter): string {
  const subject = count === 1 ? '1 request matches' : `${count} requests match`;
  return `${subject} ${filterSuffix(filter)}`;
}

/** The first block of the UUID, shown under the title and accepted by search. */
function shortId(id: string): string {
  return `#${id.slice(0, 8)}`;
}

const sectionLabel = 'text-xs font-semibold tracking-wider text-gray-600 uppercase';
const headerCell = `px-5 py-3 ${sectionLabel}`;
/** The primary button style with the page's larger radius and padding. */
const newRequestButton = `inline-flex items-center justify-center rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-800 ${focusRing}`;
const card = 'rounded-xl border border-gray-200 bg-white shadow-sm';

const SUMMARY_CARDS = [
  { key: 'needsAction', label: 'Needs your action', description: 'Reply to keep these moving' },
  {
    key: 'inProgress',
    label: 'In progress',
    description: 'Waiting on a team, nothing for you',
  },
  { key: 'completedThisMonth', label: 'Completed this month', description: 'Closed and confirmed' },
] as const;

/** Counts across every request, whatever the search or filter shows. */
function SummaryCards({ requests }: { requests: InternalRequest[] }) {
  const summary = summarizeRequests(requests);
  return (
    <section aria-labelledby="summary-heading" className="mt-8">
      <h2 id="summary-heading" className="sr-only">
        Summary
      </h2>
      <ul className="grid gap-4 sm:grid-cols-3">
        {SUMMARY_CARDS.map(({ key, label, description }) => (
          <li key={key} className={`${card} p-5`}>
            <p className={sectionLabel}>{label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{summary[key]}</p>
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RequestsTable({ requests, filter }: { requests: InternalRequest[]; filter: ListFilter }) {
  const filtered = filter.q || filter.status;
  return (
    <div className={`mt-6 overflow-x-auto ${card}`}>
      <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
        <caption className="sr-only">
          {filtered
            ? `Requests matching ${filterSuffix(filter)}, newest first`
            : 'All requests, newest first'}
        </caption>
        <thead>
          <tr>
            <th scope="col" className={headerCell}>
              Request
            </th>
            <th scope="col" className={headerCell}>
              Status
            </th>
            <th scope="col" className={headerCell}>
              Type
            </th>
            <th scope="col" className={headerCell}>
              Updated
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {requests.map((request) => (
            <tr key={request.id}>
              <td className="min-w-48 px-5 py-4">
                <Link
                  to={`/requests/${request.id}`}
                  className={`font-semibold text-gray-900 hover:text-brand-800 hover:underline ${focusRing}`}
                >
                  {request.title}
                </Link>
                <span className="mt-0.5 block text-xs text-gray-600" title={request.id}>
                  {shortId(request.id)}
                </span>
              </td>
              <td className="px-5 py-4 whitespace-nowrap">
                <StatusBadge status={request.status} />
              </td>
              <td className="px-5 py-4 text-gray-700">{request.type}</td>
              <td className="px-5 py-4 whitespace-nowrap text-gray-700">
                <time dateTime={request.updatedAt} title={formatDateTime(request.updatedAt)}>
                  {formatRelativeTime(request.updatedAt)}
                </time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
      {children}
    </div>
  );
}

/**
 * Page-only styling for the shared search form: an uppercase label like the Status filter's,
 * and the page's corner radius. The hint is visually hidden (the placeholder shows the same
 * idea) but still describes the box for screen readers, so both labels sit level.
 */
const searchFormClasses =
  'min-w-0 flex-1 basis-72 [&_#search-hint]:sr-only [&_button]:h-10 [&_button]:rounded-xl [&_input]:h-10 [&_input]:rounded-xl [&_label]:text-xs [&_label]:font-semibold [&_label]:tracking-wider [&_label]:text-gray-600 [&_label]:uppercase';

export function RequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim();
  const statusParam = searchParams.get('status');
  const status = isRequestStatus(statusParam) ? statusParam : null;
  const filter: ListFilter = { q, status };

  const { data, isPending, isError, error, refetch, isFetching } = useRequests(q ? { q } : {});
  // Without a search this is the same query (one API request); during a search it keeps the
  // summary cards counting every request.
  const allRequests = useRequests();

  /** Updates the URL, keeping the other of search and status. */
  function updateParams(next: Partial<ListFilter>) {
    const merged = { ...filter, ...next };
    const params: Record<string, string> = {};
    if (merged.q) params.q = merged.q;
    if (merged.status) params.status = merged.status;
    setSearchParams(params);
  }

  // The status filter runs in the browser over the loaded (and possibly searched) list.
  const shown = data && status ? data.filter((request) => request.status === status) : data;

  // One live region announces loading and, while filtering, how many requests match.
  let statusText = '';
  if (isPending) statusText = 'Loading requests…';
  else if (!isError && (q || status)) statusText = matchSummary(shown?.length ?? 0, filter);

  let content = null;
  if (isPending) {
    content = null;
  } else if (isError) {
    content = (
      <ErrorState
        title="Could not load requests."
        error={error}
        onRetry={() => void refetch()}
        retrying={isFetching}
      />
    );
  } else if (shown && shown.length === 0 && (q || status)) {
    content = (
      <EmptyState>
        <p className="font-medium">No requests match {filterSuffix(filter)}.</p>
        <p className="mt-1 text-gray-700">
          Try a different {q && status ? 'search or status' : q ? 'search' : 'status'}, or{' '}
          <Link to="/requests/new" className={textLink}>
            create a request
          </Link>
          .
        </p>
      </EmptyState>
    );
  } else if (shown && shown.length === 0) {
    content = (
      <EmptyState>
        <p className="font-medium">No requests yet</p>
        <p className="mt-1 text-gray-700">
          <Link to="/requests/new" className={textLink}>
            Create a request
          </Link>{' '}
          to get started.
        </p>
      </EmptyState>
    );
  } else if (shown) {
    content = <RequestsTable requests={shown} filter={filter} />;
  }

  return (
    <section aria-labelledby="requests-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 id="requests-heading" className="text-3xl font-bold tracking-tight text-gray-900">
          Requests
        </h1>
        <Link to="/requests/new" className={newRequestButton}>
          New request
        </Link>
      </div>

      {allRequests.data && <SummaryCards requests={allRequests.data} />}

      <div className="mt-8 flex flex-wrap items-start gap-x-4 gap-y-4">
        <SearchForm
          q={q}
          onSearch={(next) => updateParams({ q: next })}
          className={searchFormClasses}
          placeholder="Search by title, description or ID"
        />
        <div className="w-full sm:w-52">
          <label
            htmlFor="status-filter"
            className="block text-xs font-semibold tracking-wider text-gray-600 uppercase"
          >
            Status
          </label>
          <select
            id="status-filter"
            value={status ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              updateParams({ status: isRequestStatus(value) ? value : null });
            }}
            className={`mt-1 block h-10 w-full rounded-xl border border-gray-500 bg-white px-3 text-sm shadow-sm ${focusRing}`}
          >
            <option value="">All statuses</option>
            {REQUEST_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p role="status" className={statusText ? 'mt-4 text-sm text-gray-700' : 'sr-only'}>
        {statusText}
      </p>
      {content}
    </section>
  );
}
