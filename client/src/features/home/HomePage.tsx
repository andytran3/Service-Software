import { Link, useNavigate } from 'react-router';
import { focusRing } from '../../app/styles';
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

const chipClasses = `flex min-h-10 w-full items-center justify-center rounded-full border border-gray-300 bg-white px-2 text-sm font-medium text-gray-700 shadow-xs hover:border-brand-700 hover:text-brand-800 ${focusRing}`;

/**
 * Home-only styling for the shared search form (the request list keeps its own look): centered
 * on the hero's axis, with a larger input and the page's corner radius. The label and hint are
 * visually hidden but still name and describe the input for screen readers; the length error
 * stays visible. The input keeps its gray-500 border (4.8:1), which the 3:1 non-text contrast
 * minimum needs. Its 16 px text also stops iOS from zooming in on focus. The button has a fixed
 * width (7rem) so the chips below can line up with the input alone (see chipListClasses).
 */
const heroSearchClasses =
  'mx-auto mt-8 max-w-2xl text-center [&_#search-hint]:sr-only [&_button]:w-28 [&_button]:rounded-xl [&_button]:px-6 [&_button]:py-3.5 [&_button]:text-base [&_input]:basis-36 [&_input]:rounded-xl [&_input]:px-4 [&_input]:py-3.5 [&_input]:text-left [&_input]:text-base [&_label]:sr-only';

/**
 * Equal-width chips under the search input, ending before the Search button: the right padding
 * is the button's width (7rem) plus the gap (0.5rem). One column on phones, four from md up.
 */
const chipListClasses = 'grid gap-2 pr-30 md:grid-cols-4';

/** The Service Portal landing page at /. */
export function HomePage() {
  const navigate = useNavigate();

  function handleSearch(q: string) {
    void navigate(q ? `/requests?${new URLSearchParams({ q }).toString()}` : '/requests');
  }

  return (
    <div className="space-y-12 sm:space-y-16">
      <section
        aria-labelledby="home-heading"
        className="mx-auto max-w-2xl pt-4 text-center sm:pt-10"
      >
        <h1
          id="home-heading"
          className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl"
        >
          How can we help?
        </h1>
        <p className="mt-3 text-gray-600 sm:text-lg">Search your requests, or start a new one.</p>
        <SearchForm q="" onSearch={handleSearch} className={heroSearchClasses} />
        <div className="mt-5">
          {/* Visually hidden: the chips speak for themselves; screen readers still hear the group name. */}
          <p id="common-requests" className="sr-only">
            Common requests
          </p>
          <ul aria-labelledby="common-requests" className={chipListClasses}>
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
      {/* One container for both sections; on wide screens the services get the wider column (2:3). */}
      <div className="grid gap-10 md:grid-cols-5 md:gap-8 md:[&>*:first-child]:col-span-2 md:[&>*:last-child]:col-span-3">
        <OpenRequestsPanel />
        <ServiceCards />
      </div>
    </div>
  );
}
