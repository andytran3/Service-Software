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
      <h2 id="services-heading" className="text-lg font-semibold">
        Services
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {SERVICES.map(({ type, description }) => {
          const descriptionId = `service-${type.toLowerCase()}-description`;
          return (
            <li
              key={type}
              className="relative rounded-lg border border-gray-300 bg-white p-4 hover:border-brand-700 hover:bg-brand-50"
            >
              <Link
                to={`/requests/new?type=${encodeURIComponent(type)}`}
                aria-describedby={descriptionId}
                className="font-semibold text-brand-700 after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand-600"
              >
                {type}
              </Link>
              <p id={descriptionId} className="mt-1 text-sm text-gray-700">
                {description}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
