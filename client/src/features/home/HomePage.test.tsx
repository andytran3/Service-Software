import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { jsonResponse, stubFetch } from '../../test/fetch';
import { renderRoute } from '../../test/render';

function stubEmptyList() {
  return stubFetch(() => jsonResponse(200, { data: [] }));
}

async function renderHome() {
  const result = renderRoute('/');
  await screen.findByRole('heading', { level: 1, name: 'How can we help?' });
  return result;
}

describe('HomePage', () => {
  it('shows the hero, the open requests and the services, in that order', async () => {
    stubEmptyList();
    await renderHome();

    expect(screen.getByText('Search your requests, or start a new one.')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Open requests',
      'Services',
    ]);
    const main = screen.getByRole('main');
    // The hero has no New request button; the header's New request link is outside main.
    expect(within(main).queryByRole('link', { name: 'New request' })).not.toBeInTheDocument();
  });

  it('searches from the hero and opens the results on /requests', async () => {
    const { calls } = stubEmptyList();
    const { user, router } = await renderHome();

    const search = screen.getByRole('searchbox', { name: 'Search requests' });
    expect(search).toHaveAccessibleDescription('Searches titles and descriptions.');
    await user.type(search, '  badge reader  {Enter}');

    expect(await screen.findByRole('heading', { level: 1, name: 'Requests' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/requests');
    expect(router.state.location.search).toBe('?q=badge+reader');
    expect(calls.at(-1)?.url).toBe('/api/requests?q=badge+reader');
  });

  it('opens the full list when a blank search is submitted', async () => {
    stubEmptyList();
    const { user, router } = await renderHome();

    await user.type(screen.getByRole('searchbox', { name: 'Search requests' }), '   {Enter}');

    expect(await screen.findByRole('heading', { level: 1, name: 'Requests' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('keeps the hero search on the page when it is too long', async () => {
    stubEmptyList();
    const { user, router } = await renderHome();

    const search = screen.getByRole('searchbox', { name: 'Search requests' });
    await user.click(search);
    await user.paste('a'.repeat(201));
    await user.keyboard('{Enter}');

    expect(search).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Search must be at most 200 characters')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });

  it('offers common requests that fill in the type', async () => {
    stubEmptyList();
    await renderHome();

    const list = screen.getByRole('list', { name: 'Common requests' });
    const links = within(list).getAllByRole('link');
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['New laptop', '/requests/new?type=IT'],
      ['Software access', '/requests/new?type=IT'],
      ['Reset password', '/requests/new?type=IT'],
      ['Book a room', '/requests/new?type=Facilities'],
    ]);
  });

  it('opens the form with the type selected from a common request', async () => {
    stubEmptyList();
    const { user, router } = await renderHome();

    await user.click(screen.getByRole('link', { name: 'Book a room' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'New request' }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe('?type=Facilities');
    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveValue('Facilities');
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('');
  });
});

describe('ServiceCards', () => {
  it('links each request type to the form, with its description', async () => {
    stubEmptyList();
    await renderHome();

    const services = screen.getByRole('region', { name: 'Services' });
    const cards = within(services)
      .getAllByRole('link')
      .map((link) => ({
        name: link.textContent,
        href: link.getAttribute('href'),
        description: link.getAttribute('aria-describedby')
          ? document.getElementById(link.getAttribute('aria-describedby') ?? '')?.textContent
          : null,
      }));
    expect(cards).toEqual([
      {
        name: 'IT',
        href: '/requests/new?type=IT',
        description: 'Laptops, software, accounts and access',
      },
      {
        name: 'Facilities',
        href: '/requests/new?type=Facilities',
        description: 'Rooms, desks, the building and repairs',
      },
      {
        name: 'HR',
        href: '/requests/new?type=HR',
        description: 'Leave, pay, onboarding and policies',
      },
      { name: 'Other', href: '/requests/new?type=Other', description: 'Anything else' },
    ]);
    expect(within(services).getByRole('link', { name: 'HR' })).toHaveAccessibleDescription(
      'Leave, pay, onboarding and policies',
    );
  });
});
