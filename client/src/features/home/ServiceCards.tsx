import { Link } from 'react-router';
import type { RequestType } from '../requests/types';

/** One card per request type. Categories may replace these later. */
export const SERVICES: { type: RequestType; description: string }[] = [
  { type: 'IT', description: 'Laptops, software, accounts and access' },
  { type: 'Facilities', description: 'Rooms, desks, the building and repairs' },
  { type: 'HR', description: 'Leave, pay, onboarding and policies' },
  { type: 'Other', description: 'Anything else' },
];

/**
 * Each card is one link (stretched over the card) named by its type; the description is
 * attached with aria-describedby so screen readers do not read it as part of the link name.
 */
export function ServiceCards() {
  return (
    <section aria-labelledby="services-heading">
      <h2
        id="services-heading"
        className="text-xs font-semibold tracking-wider text-gray-600 uppercase"
      >
        Services
      </h2>
      <ul className="mt-3 grid gap-4 sm:grid-cols-2">
        {SERVICES.map(({ type, description }) => {
          const descriptionId = `service-${type.toLowerCase()}-description`;
          return (
            <li
              key={type}
              className="group relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:border-brand-700 hover:shadow-md"
            >
              <Link
                to={`/requests/new?type=${encodeURIComponent(type)}`}
                aria-describedby={descriptionId}
                className="font-semibold text-gray-900 group-hover:text-brand-800 after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand-600"
              >
                {type}
              </Link>
              <p id={descriptionId} className="mt-1.5 text-sm text-gray-600">
                {description}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
