import { Link, replace, type LoaderFunctionArgs, type RouteObject } from 'react-router';
import { HomePage } from '../features/home/HomePage';
import { NewRequestPage } from '../features/requests/pages/NewRequestPage';
import { RequestDetailPage } from '../features/requests/pages/RequestDetailPage';
import { RequestsPage } from '../features/requests/pages/RequestsPage';
import { Layout } from './Layout';
import { textLink } from './styles';

function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-heading">
      <h1 id="not-found-heading" className="text-2xl font-semibold">
        Page not found
      </h1>
      <p className="mt-2">
        <Link to="/requests" className={textLink}>
          Go to requests
        </Link>
      </p>
    </section>
  );
}

/**
 * Search links from before the landing page existed (/?q=…) open the same search on /requests.
 * replace (not redirect) so the back button does not return to / and bounce forward again.
 */
function redirectOldSearchLinks({ request }: LoaderFunctionArgs) {
  const q = new URL(request.url).searchParams.get('q')?.trim();
  return q ? replace(`/requests?${new URLSearchParams({ q }).toString()}`) : null;
}

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, loader: redirectOldSearchLinks, Component: HomePage },
      { path: 'requests', Component: RequestsPage },
      { path: 'requests/new', Component: NewRequestPage },
      { path: 'requests/:id', Component: RequestDetailPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
];
