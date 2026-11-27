import { Link, useNavigate } from 'react-router';
import { focusRing, primaryButton } from '../../app/styles';
import { SearchForm } from '../requests/components/SearchForm';
import type { RequestType } from '../requests/types';
import { OpenRequestsPanel } from './OpenRequestsPanel';
import { ServiceCards } from './ServiceCards';

/** Shortcuts to common requests. They fill in the type only; the title stays empty. */
export const QUICK_REQUESTS: { label: string; type: RequestType }[] = [
  { label: 'New laptop', type: 'IT' },
  { label: 'Software access', type: 'IT' },
  { label: 'Reset password', type: 'IT' },
  { label: 'Book a room', type: 'Facilities' },
];

const chipClasses = `inline-flex min-h-10 items-center rounded-full border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 hover:border-brand-700 hover:bg-brand-50 ${focusRing}`;

/** The Service Portal landing page at /. */
export function HomePage() {
  const navigate = useNavigate();

  function handleSearch(q: string) {
    void navigate(q ? `/requests?${new URLSearchParams({ q }).toString()}` : '/requests');
  }

  return (
    <div className="space-y-8">
      <section
        aria-labelledby="home-heading"
        className="rounded-lg border border-gray-300 bg-white p-5 sm:p-8"
      >
        <h1 id="home-heading" className="text-2xl font-semibold sm:text-3xl">
          How can we help?
        </h1>
        <p className="mt-2 text-gray-700">Search your requests, or start a new one.</p>
        <SearchForm q="" onSearch={handleSearch} className="mt-5" />
        <p className="mt-4">
          <Link to="/requests/new" className={primaryButton}>
            New request
          </Link>
        </p>
        <div className="mt-6">
          <p id="common-requests" className="text-sm font-medium text-gray-900">
            Common requests
          </p>
          <ul aria-labelledby="common-requests" className="mt-2 flex flex-wrap gap-2">
            {QUICK_REQUESTS.map(({ label, type }) => (
              <li key={label}>
                <Link to={`/requests/new?type=${encodeURIComponent(type)}`} className={chipClasses}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Open requests come first in the source: on top on phones, the left column on wide screens. */}
      <div className="grid gap-8 md:grid-cols-2">
        <OpenRequestsPanel />
        <ServiceCards />
      </div>
    </div>
  );
}
