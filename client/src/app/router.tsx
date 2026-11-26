import { Link, type RouteObject } from 'react-router';
import { NewRequestPage } from '../features/requests/pages/NewRequestPage';
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
        <Link to="/" className={textLink}>
          Go to requests
        </Link>
      </p>
    </section>
  );
}

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: RequestsPage },
      { path: 'requests/new', Component: NewRequestPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
];
