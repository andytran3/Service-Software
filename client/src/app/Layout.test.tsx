import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { jsonResponse, stubFetch } from '../test/fetch';
import { renderRoute } from '../test/render';

beforeEach(() => {
  // The requests page loads the list; an empty list keeps these layout tests focused.
  stubFetch(() => jsonResponse(200, { data: [] }));
});

describe('Layout', () => {
  it('renders the header, main navigation, and main landmark', () => {
    renderRoute('/');

    expect(screen.getByRole('banner')).toHaveTextContent('Internal Requests');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Requests' })).toHaveAttribute('href', '/');
    expect(within(nav).getByRole('link', { name: 'New request' })).toHaveAttribute(
      'href',
      '/requests/new',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });

  it('marks the current page in the navigation', () => {
    renderRoute('/requests/new');

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'New request' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Requests' })).not.toHaveAttribute('aria-current');
  });

  it('renders the requests page at /', () => {
    renderRoute('/');

    expect(screen.getByRole('heading', { level: 1, name: 'Requests' })).toBeInTheDocument();
  });

  it('makes the skip link the first keyboard stop and points it at main content', async () => {
    const { user } = renderRoute('/');

    await user.tab();

    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute('href', '#main');
  });

  it('reaches the navigation links with the keyboard', async () => {
    const { user } = renderRoute('/');

    await user.tab(); // skip link
    await user.tab(); // app name
    await user.tab(); // Requests nav link

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Requests' })).toHaveFocus();

    await user.tab(); // New request nav link

    expect(within(nav).getByRole('link', { name: 'New request' })).toHaveFocus();
  });

  it('shows a not-found page for unknown routes', () => {
    renderRoute('/does-not-exist');

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to requests' })).toHaveAttribute('href', '/');
  });
});
