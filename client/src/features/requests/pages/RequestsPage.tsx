import { Link, useSearchParams } from 'react-router';
import { primaryButton, textLink } from '../../../app/styles';
import { ErrorState } from '../components/ErrorState';
import { SearchForm } from '../components/SearchForm';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../format';
import { useRequests } from '../hooks';
import type { InternalRequest } from '../types';

function matchSummary(count: number, q: string): string {
  return `${count === 1 ? '1 request matches' : `${count} requests match`} “${q}”`;
}

function RequestsTable({ requests, q }: { requests: InternalRequest[]; q: string }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-md border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
        <caption className="sr-only">
          {q ? `Requests matching “${q}”, newest first` : 'All requests, newest first'}
        </caption>
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              Title
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Type
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Created
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {requests.map((request) => (
            <tr key={request.id}>
              <td className="px-4 py-3">
                <Link to={`/requests/${request.id}`} className={`font-medium ${textLink}`}>
                  {request.title}
                </Link>
              </td>
              <td className="px-4 py-3">{request.type}</td>
              <td className="px-4 py-3">
                <StatusBadge status={request.status} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <time dateTime={request.createdAt}>{formatDateTime(request.createdAt)}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim();
  const { data, isPending, isError, error, refetch, isFetching } = useRequests(q ? { q } : {});

  function handleSearch(next: string) {
    setSearchParams(next ? { q: next } : {});
  }

  // One live region announces loading and, during a search, how many requests match.
  let statusText = '';
  if (isPending) statusText = 'Loading requests…';
  else if (!isError && q) statusText = matchSummary(data.length, q);

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
  } else if (data.length === 0 && q) {
    content = (
      <div className="mt-4 rounded-md border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="font-medium">No requests match “{q}”.</p>
        <p className="mt-1 text-gray-700">
          Try a different search, or{' '}
          <Link to="/requests/new" className={textLink}>
            create a request
          </Link>
          .
        </p>
      </div>
    );
  } else if (data.length === 0) {
    content = (
      <div className="mt-4 rounded-md border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="font-medium">No requests yet</p>
        <p className="mt-1 text-gray-700">
          <Link to="/requests/new" className={textLink}>
            Create a request
          </Link>{' '}
          to get started.
        </p>
      </div>
    );
  } else {
    content = <RequestsTable requests={data} q={q} />;
  }

  return (
    <section aria-labelledby="requests-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 id="requests-heading" className="text-2xl font-semibold">
          Requests
        </h1>
        <Link to="/requests/new" className={primaryButton}>
          New request
        </Link>
      </div>
      <SearchForm q={q} onSearch={handleSearch} />
      <p role="status" className={statusText ? 'mt-4 text-sm text-gray-700' : 'sr-only'}>
        {statusText}
      </p>
      {content}
    </section>
  );
}
