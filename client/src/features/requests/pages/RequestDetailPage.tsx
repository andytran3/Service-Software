import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { focusRing, primaryButton, textLink } from '../../../app/styles';
import { isNotFound } from '../api';
import { ErrorState } from '../components/ErrorState';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../format';
import { useRequest, useUpdateRequestStatus } from '../hooks';
import { REQUEST_STATUSES, type InternalRequest, type RequestStatus } from '../types';

function isRequestStatus(value: string): value is RequestStatus {
  return (REQUEST_STATUSES as readonly string[]).includes(value);
}

/** True when the page was reached right after creating the request. */
function wasJustCreated(state: unknown): boolean {
  return (
    typeof state === 'object' && state !== null && 'created' in state && state.created === true
  );
}

function BackLink() {
  return (
    <Link to="/" className={`text-sm ${textLink}`}>
      ← Back to requests
    </Link>
  );
}

interface StatusFormProps {
  request: InternalRequest;
  onUpdated: (status: RequestStatus) => void;
}

function StatusForm({ request, onUpdated }: StatusFormProps) {
  const updateStatus = useUpdateRequestStatus(request.id);
  const [selected, setSelected] = useState<RequestStatus>(request.status);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateStatus.mutate(selected, { onSuccess: (updated) => onUpdated(updated.status) });
  }

  const unchanged = selected === request.status;

  return (
    <form onSubmit={handleSubmit} className="mt-8 rounded-md border border-gray-200 bg-white p-4">
      <h2 className="text-lg font-semibold">Update status</h2>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="status" className="block text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={selected}
            onChange={(event) => {
              if (isRequestStatus(event.target.value)) setSelected(event.target.value);
            }}
            className={`mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ${focusRing}`}
          >
            {REQUEST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={unchanged || updateStatus.isPending}
          className={primaryButton}
        >
          {updateStatus.isPending ? 'Updating…' : 'Update status'}
        </button>
      </div>
      {updateStatus.isError && (
        <div role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="font-medium text-red-900">Could not update the status.</p>
          <p className="mt-1 text-sm text-red-800">{updateStatus.error.message}</p>
        </div>
      )}
    </form>
  );
}

function RequestDetails({ request, notice }: { request: InternalRequest; notice: string }) {
  return (
    <article aria-labelledby="request-heading">
      <BackLink />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 id="request-heading" className="text-2xl font-semibold break-words">
          {request.title}
        </h1>
        <StatusBadge status={request.status} />
      </div>

      <p role="status" className="mt-3 min-h-6 text-sm font-medium text-green-800">
        {notice}
      </p>

      <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-gray-600">Type</dt>
          <dd className="mt-0.5 font-medium">{request.type}</dd>
        </div>
        <div>
          <dt className="text-sm text-gray-600">Status</dt>
          <dd className="mt-0.5 font-medium">{request.status}</dd>
        </div>
        <div>
          <dt className="text-sm text-gray-600">Created</dt>
          <dd className="mt-0.5">
            <time dateTime={request.createdAt}>{formatDateTime(request.createdAt)}</time>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-gray-600">Last updated</dt>
          <dd className="mt-0.5">
            <time dateTime={request.updatedAt}>{formatDateTime(request.updatedAt)}</time>
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-sm text-gray-600">Description</dt>
          <dd className="mt-0.5 whitespace-pre-wrap break-words">{request.description}</dd>
        </div>
      </dl>
    </article>
  );
}

export function RequestDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data, isPending, isError, error, refetch, isFetching } = useRequest(id);

  // Show "Request created" once, then clear the history state so a reload does not repeat it.
  const [justCreated] = useState(() => wasJustCreated(location.state));
  const [updatedTo, setUpdatedTo] = useState<RequestStatus | null>(null);
  useEffect(() => {
    if (wasJustCreated(location.state)) {
      void navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  if (isPending) {
    return (
      <p role="status" className="text-gray-700">
        Loading request…
      </p>
    );
  }

  if (isError) {
    if (isNotFound(error)) {
      return (
        <section aria-labelledby="not-found-heading">
          <h1 id="not-found-heading" className="text-2xl font-semibold">
            Request not found
          </h1>
          <p className="mt-2 text-gray-700">
            This request does not exist or may have been removed.
          </p>
          <p className="mt-4">
            <BackLink />
          </p>
        </section>
      );
    }
    return (
      <section aria-labelledby="request-error-heading">
        <BackLink />
        <h1 id="request-error-heading" className="mt-4 text-2xl font-semibold">
          Request
        </h1>
        <ErrorState
          title="Could not load this request."
          error={error}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      </section>
    );
  }

  const notice = updatedTo
    ? `Status updated to ${updatedTo}.`
    : justCreated
      ? 'Request created.'
      : '';

  return (
    <>
      <RequestDetails request={data} notice={notice} />
      <StatusForm key={data.id} request={data} onUpdated={setUpdatedTo} />
    </>
  );
}
