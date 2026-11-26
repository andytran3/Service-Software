import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { jsonResponse, stubFetch } from '../test/fetch';
import { renderRoute } from '../test/render';

beforeEach(() => {
  // The requests page loads the list; an empty list keeps these layout tests focused.
  stubFetch(() => jsonResponse(200, { data: [] }));
});

describe('Layout', () => {
  it('renders the header, main navigation, and main landmark', () => {
    renderRoute('/requests');

    expect(screen.getByRole('banner')).toHaveTextContent('Service Portal');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Requests' })).toHaveAttribute(
      'href',
      '/requests',
    );
    expect(within(nav).getByRole('link', { name: 'New request' })).toHaveAttribute(
      'href',
      '/requests/new',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });

  it.each([
    ['/requests', 'Requests'],
    ['/requests/17918d78-824a-4810-af53-4e55b7d4493c', 'Requests'],
    ['/requests/new', 'New request'],
  ])('marks the current page in the navigation on %s', (path, currentName) => {
    renderRoute(path);

    const nav = screen.getByRole('navigation', { name: 'Main' });
    for (const name of ['Requests', 'New request']) {
      const link = within(nav).getByRole('link', { name });
      if (name === currentName) expect(link).toHaveAttribute('aria-current', 'page');
      else expect(link).not.toHaveAttribute('aria-current');
    }
  });

  it('marks no navigation link on the not-found page', () => {
    renderRoute('/does-not-exist');

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).queryAllByRole('link', { current: 'page' })).toHaveLength(0);
  });

  it('renders the requests page at /requests', () => {
    renderRoute('/requests');

    expect(screen.getByRole('heading', { level: 1, name: 'Requests' })).toBeInTheDocument();
  });

  it.each(['/', '/?q=', '/?q=%20%20'])('renders the landing page at %s', async (path) => {
    const { router } = renderRoute(path);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'How can we help?' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).queryAllByRole('link', { current: 'page' })).toHaveLength(0);
  });

  it('opens an old /?q= search link on the request list', async () => {
    const { router } = renderRoute('/?q=%20badge%20');

    await waitFor(() => expect(router.state.location.pathname).toBe('/requests'));
    expect(router.state.location.search).toBe('?q=badge');
    expect(await screen.findByRole('heading', { level: 1, name: 'Requests' })).toBeInTheDocument();
  });

  it('makes the skip link the first keyboard stop and points it at main content', async () => {
    const { user } = renderRoute('/requests');

    await user.tab();

    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute('href', '#main');
  });

  it('reaches the navigation links with the keyboard', async () => {
    const { user } = renderRoute('/requests');

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
    expect(screen.getByRole('link', { name: 'Go to requests' })).toHaveAttribute(
      'href',
      '/requests',
    );
  });
});
