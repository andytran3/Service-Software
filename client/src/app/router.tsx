import { Link, replace, type LoaderFunctionArgs, type RouteObject } from 'react-router';
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

/** Until the landing page exists, / sends visitors (and any ?q= search) to the request list. */
function redirectToRequests({ request }: LoaderFunctionArgs) {
  // replace (not redirect) so the back button does not return to / and bounce forward again.
  return replace(`/requests${new URL(request.url).search}`);
}

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, loader: redirectToRequests },
      { path: 'requests', Component: RequestsPage },
      { path: 'requests/new', Component: NewRequestPage },
      { path: 'requests/:id', Component: RequestDetailPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
];
