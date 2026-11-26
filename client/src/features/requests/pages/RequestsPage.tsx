import { useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { focusRing, primaryButton, secondaryButton, textLink } from '../../../app/styles';
import { ErrorState } from '../components/ErrorState';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../format';
import { useRequests } from '../hooks';
import { SEARCH_MAX_LENGTH } from '../schemas';
import type { InternalRequest } from '../types';

function matchSummary(count: number, q: string): string {
  return `${count === 1 ? '1 request matches' : `${count} requests match`} “${q}”`;
}

interface SearchFormProps {
  /** The active search from the URL ('' when none). */
  q: string;
  onSearch: (q: string) => void;
}

/** Searches when submitted (Enter or the button); the text is kept in the URL by the page. */
function SearchForm({ q, onSearch }: SearchFormProps) {
  const [value, setValue] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Follow URL changes (back/forward, links) without an effect.
  if (q !== syncedQ) {
    setSyncedQ(q);
    setValue(q);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length > SEARCH_MAX_LENGTH) {
      setError(`Search must be at most ${SEARCH_MAX_LENGTH} characters`);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    onSearch(trimmed);
  }

  function handleClear() {
    setValue('');
    setError(null);
    onSearch('');
    inputRef.current?.focus();
  }

  const describedBy = ['search-hint', error ? 'search-error' : null].filter(Boolean).join(' ');

  return (
    <form role="search" onSubmit={handleSubmit} noValidate className="mt-6">
      <label htmlFor="search" className="block text-sm font-medium">
        Search requests
      </label>
      <p id="search-hint" className="mt-0.5 text-xs text-gray-600">
        Searches titles and descriptions.
      </p>
      <div className="mt-1 flex flex-wrap gap-2">
        <input
          ref={inputRef}
          id="search"
          name="q"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`min-w-0 flex-1 basis-60 rounded-md border bg-white px-3 py-2 text-sm shadow-sm ${error ? 'border-red-600' : 'border-gray-500'} ${focusRing}`}
        />
        <button type="submit" className={primaryButton}>
          Search
        </button>
        {q && (
          <button type="button" onClick={handleClear} className={secondaryButton}>
            Clear search
          </button>
        )}
      </div>
      {error && (
        <p id="search-error" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
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
