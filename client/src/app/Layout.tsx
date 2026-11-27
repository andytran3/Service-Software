import { Link, Outlet, useMatch } from 'react-router';
import { focusRing } from './styles';

function navLinkClass(active: boolean): string {
  return `rounded px-2 py-1 ${active ? 'font-semibold text-brand-700' : 'text-gray-700'} ${focusRing}`;
}

/**
 * Which nav link is current. "Requests" covers the list and a request's detail page, but not
 * the new-request form, which has its own link (a plain NavLink would mark both).
 */
function useCurrentNav() {
  const onList = useMatch('/requests');
  const onRequest = useMatch('/requests/:id');
  const onNewRequest = useMatch('/requests/new');
  return {
    requests: Boolean(onList || (onRequest && !onNewRequest)),
    newRequest: Boolean(onNewRequest),
  };
}

export function Layout() {
  const current = useCurrentNav();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <a
        href="#main"
        className={`sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-white focus:px-4 focus:py-2 ${focusRing}`}
      >
        Skip to main content
      </a>

      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4">
          <Link to="/" className={`text-lg font-semibold ${focusRing}`}>
            Service Portal
          </Link>
          <nav aria-label="Main">
            <ul className="flex gap-4">
              <li>
                <Link
                  to="/requests"
                  aria-current={current.requests ? 'page' : undefined}
                  className={navLinkClass(current.requests)}
                >
                  Requests
                </Link>
              </li>
              <li>
                <Link
                  to="/requests/new"
                  aria-current={current.newRequest ? 'page' : undefined}
                  className={navLinkClass(current.newRequest)}
                >
                  New request
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-8 focus:outline-none">
        <Outlet />
      </main>
    </div>
  );
}
