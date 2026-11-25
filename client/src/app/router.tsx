import { Link, type RouteObject } from 'react-router';
import { RequestsPage } from '../features/requests/pages/RequestsPage';
import { Layout } from './Layout';

function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-heading">
      <h1 id="not-found-heading" className="text-2xl font-semibold">
        Page not found
      </h1>
      <p className="mt-2">
        <Link
          to="/"
          className="text-blue-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
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
      { path: '*', Component: NotFoundPage },
    ],
  },
];
