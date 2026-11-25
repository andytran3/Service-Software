import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from './router';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

describe('Layout', () => {
  it('renders the header, main navigation, and main landmark', () => {
    renderAt('/');

    expect(screen.getByRole('banner')).toHaveTextContent('Internal Requests');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav).toContainElement(screen.getByRole('link', { name: 'Requests' }));
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });

  it('renders the requests placeholder page at /', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { level: 1, name: 'Requests' })).toBeInTheDocument();
  });

  it('makes the skip link the first keyboard stop and points it at main content', async () => {
    const user = userEvent.setup();
    renderAt('/');

    await user.tab();

    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute('href', '#main');
  });

  it('reaches the navigation links with the keyboard', async () => {
    const user = userEvent.setup();
    renderAt('/');

    await user.tab(); // skip link
    await user.tab(); // app name
    await user.tab(); // Requests nav link

    expect(screen.getByRole('link', { name: 'Requests' })).toHaveFocus();
  });

  it('shows a not-found page for unknown routes', () => {
    renderAt('/does-not-exist');

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to requests' })).toHaveAttribute('href', '/');
  });
});
