import { Link, Outlet, useMatch } from 'react-router';
import { focusRing, textLink } from './styles';

function navLinkClass(active: boolean): string {
  return `rounded px-2 py-1 ${active ? 'font-semibold text-brand-700' : 'text-gray-700'} ${focusRing}`;
}

/**
 * Which nav link is current. "Home" is the landing page only; "Requests" covers the list and
 * everything under it (a request's detail page and the new-request form). The not-found page
 * marks neither.
 */
function useCurrentNav() {
  const onHome = useMatch('/');
  const onList = useMatch('/requests');
  const onRequestPage = useMatch('/requests/:id');
  return { home: Boolean(onHome), requests: Boolean(onList || onRequestPage) };
}

/** The main navigation, shown on every page except the new-request form. */
function MainNav() {
  const current = useCurrentNav();
  return (
    <nav aria-label="Main">
      <ul className="flex gap-4">
        <li>
          <Link
            to="/"
            aria-current={current.home ? 'page' : undefined}
            className={navLinkClass(current.home)}
          >
            Home
          </Link>
        </li>
        <li>
          <Link
            to="/requests"
            aria-current={current.requests ? 'page' : undefined}
            className={navLinkClass(current.requests)}
          >
            Requests
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export function Layout() {
  // The new-request form gets a focused header: the brand and a way out, no navigation.
  const inRequestFlow = Boolean(useMatch('/requests/new'));

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
          <Link to="/" className={`flex items-center gap-3 text-lg font-semibold ${focusRing}`}>
            {inRequestFlow && (
              <span aria-hidden="true" className="size-8 rounded-lg bg-brand-700" />
            )}
            Service Portal
          </Link>
          {inRequestFlow ? (
            <Link to="/requests" className={`font-medium ${textLink}`}>
              Cancel request
            </Link>
          ) : (
            <MainNav />
          )}
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-8 focus:outline-none">
        <Outlet />
      </main>
    </div>
  );
}
