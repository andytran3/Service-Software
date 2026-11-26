import { Link } from 'react-router';
import { focusRing, textLink } from '../../app/styles';
import { ErrorState } from '../requests/components/ErrorState';
import { StatusBadge } from '../requests/components/StatusBadge';
import { formatDateTime, formatRelativeTime } from '../requests/format';
import { useOpenRequests } from '../requests/hooks';
import type { InternalRequest } from '../requests/types';

function OpenRequestRow({ request }: { request: InternalRequest }) {
  return (
    <li>
      <Link
        to={`/requests/${request.id}`}
        className={`flex items-center gap-3 rounded-md px-3 py-3 hover:bg-gray-50 ${focusRing}`}
      >
        <span className="min-w-0 flex-1">
          <span className="block font-medium break-words text-gray-900">{request.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
            <StatusBadge status={request.status} />
            <span>
              Updated{' '}
              <time dateTime={request.updatedAt} title={formatDateTime(request.updatedAt)}>
                {formatRelativeTime(request.updatedAt)}
              </time>
            </span>
          </span>
        </span>
        <span aria-hidden="true" className="text-gray-500">
          →
        </span>
      </Link>
    </li>
  );
}

/** Up to five open requests, those that need a reply first; links to the full list. */
export function OpenRequestsPanel() {
  const { data, isPending, isError, error, refetch, isFetching } = useOpenRequests();

  let content;
  if (isPending) {
    content = (
      <p role="status" className="mt-3 text-sm text-gray-700">
        Loading open requests…
      </p>
    );
  } else if (isError) {
    content = (
      <ErrorState
        title="Could not load open requests."
        error={error}
        onRetry={() => void refetch()}
        retrying={isFetching}
      />
    );
  } else if (data.length === 0) {
    content = (
      <p className="mt-3 text-sm text-gray-700">
        There are no open requests.{' '}
        <Link to="/requests/new" className={textLink}>
          Create a request
        </Link>
      </p>
    );
  } else {
    content = (
      <ul className="mt-2 divide-y divide-gray-200">
        {data.map((request) => (
          <OpenRequestRow key={request.id} request={request} />
        ))}
      </ul>
    );
  }

  return (
    <section
      aria-labelledby="open-requests-heading"
      className="rounded-lg border border-gray-300 bg-white p-4 sm:p-5"
    >
      <h2 id="open-requests-heading" className="text-lg font-semibold">
        Open requests
      </h2>
      {content}
      <p className="mt-4 text-sm">
        <Link to="/requests" className={textLink}>
          View all requests
        </Link>
      </p>
    </section>
  );
}
