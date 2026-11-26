import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { jsonResponse, pendingResponse, stubFetch } from '../../../test/fetch';
import { renderRoute } from '../../../test/render';
import type { InternalRequest } from '../types';

const newer: InternalRequest = {
  id: '61c1340b-066d-4943-87ca-aa58425a60d3',
  title: 'Onboard new hire',
  description: 'Laptop and accounts.',
  type: 'HR',
  status: 'In Progress',
  createdAt: '2026-11-25T10:00:00.000Z',
  updatedAt: '2026-11-25T11:00:00.000Z',
};

const older: InternalRequest = {
  id: '17918d78-824a-4810-af53-4e55b7d4493c',
  title: 'Replace monitor',
  description: 'Flickers on startup.',
  type: 'Facilities',
  status: 'New',
  createdAt: '2026-11-24T09:00:00.000Z',
  updatedAt: '2026-11-24T09:00:00.000Z',
};

describe('RequestsPage', () => {
  it('requests the list from the API and shows a loading state', async () => {
    const { calls } = stubFetch(() => pendingResponse());

    renderRoute('/');

    expect(await screen.findByRole('status')).toHaveTextContent('Loading requests…');
    expect(calls[0]).toMatchObject({ url: '/api/requests', method: 'GET' });
  });

  it('links to the new request page from the heading area', async () => {
    stubFetch(() => jsonResponse(200, { data: [] }));

    renderRoute('/');

    const main = screen.getByRole('main');
    expect(within(main).getByRole('link', { name: 'New request' })).toHaveAttribute(
      'href',
      '/requests/new',
    );
  });

  it('shows an empty state with a link to create a request', async () => {
    stubFetch(() => jsonResponse(200, { data: [] }));

    renderRoute('/');

    expect(await screen.findByText('No requests yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create a request' })).toHaveAttribute(
      'href',
      '/requests/new',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows requests in a table in the order returned by the API (newest first)', async () => {
    stubFetch(() => jsonResponse(200, { data: [newer, older] }));

    renderRoute('/');

    const table = await screen.findByRole('table', { name: 'All requests, newest first' });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent);
    expect(headers).toEqual(['Title', 'Type', 'Status', 'Created']);

    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    const [firstRow, secondRow] = rows;
    if (!firstRow || !secondRow) throw new Error('Expected two data rows');

    const first = within(firstRow);
    expect(first.getByRole('link', { name: 'Onboard new hire' })).toHaveAttribute(
      'href',
      `/requests/${newer.id}`,
    );
    expect(first.getByText('HR')).toBeInTheDocument();
    expect(first.getByText('In Progress')).toBeInTheDocument();
    expect(firstRow.querySelector('time')).toHaveAttribute('dateTime', newer.createdAt);

    const second = within(secondRow);
    expect(second.getByRole('link', { name: 'Replace monitor' })).toBeInTheDocument();
    expect(second.getByText('Facilities')).toBeInTheDocument();
    expect(second.getByText('New')).toBeInTheDocument();
  });

  it('shows an error with the server message and recovers with "Try again"', async () => {
    let attempts = 0;
    const { calls } = stubFetch(() => {
      attempts += 1;
      return attempts === 1
        ? jsonResponse(500, {
            error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
          })
        : jsonResponse(200, { data: [older] });
    });
    const { user } = renderRoute('/');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load requests.');
    expect(alert).toHaveTextContent('An unexpected error occurred.');

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: 'Replace monitor' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(calls).toHaveLength(2);
  });

  it('explains when the server cannot be reached', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));

    renderRoute('/');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the server. Check your connection and try again.',
    );
  });
});

describe('RequestsPage search', () => {
  /** Answers list requests: everything without q, or titles containing q (any case). */
  function stubSearchableList() {
    return stubFetch((call) => {
      const q = new URL(call.url, 'http://localhost').searchParams.get('q');
      const data = q
        ? [newer, older].filter((item) => item.title.toLowerCase().includes(q.toLowerCase()))
        : [newer, older];
      return jsonResponse(200, { data });
    });
  }

  it('has a labelled search box with a hint', async () => {
    stubSearchableList();
    renderRoute('/');

    const search = screen.getByRole('searchbox', { name: 'Search requests' });
    expect(search).toHaveAccessibleDescription('Searches titles and descriptions.');
    expect(screen.getByRole('search')).toContainElement(search);
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });

  it('searches on submit, keeps the text in the URL, and announces the result count', async () => {
    const { calls } = stubSearchableList();
    const { user, router } = renderRoute('/');
    await screen.findByRole('link', { name: 'Onboard new hire' });

    await user.type(screen.getByRole('searchbox', { name: 'Search requests' }), '  monitor  ');
    expect(calls).toHaveLength(1); // typing alone does not search
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('status')).toHaveTextContent('1 request matches “monitor”');
    expect(router.state.location.search).toBe('?q=monitor');
    expect(calls.at(-1)?.url).toBe('/api/requests?q=monitor');
    expect(screen.getByRole('link', { name: 'Replace monitor' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Onboard new hire' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Requests matching “monitor”, newest first' }),
    ).toBeInTheDocument();
  });

  it('runs the search from the URL when the page opens', async () => {
    const { calls } = stubSearchableList();
    renderRoute('/?q=onboard');

    expect(await screen.findByRole('link', { name: 'Onboard new hire' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search requests' })).toHaveValue('onboard');
    expect(calls[0]?.url).toBe('/api/requests?q=onboard');
    expect(screen.getByRole('status')).toHaveTextContent('1 request matches “onboard”');
  });

  it('shows a no-results state and clears the search', async () => {
    stubSearchableList();
    const { user, router } = renderRoute('/?q=projector');

    expect(await screen.findByText('No requests match “projector”.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('0 requests match “projector”');
    expect(screen.queryByText('No requests yet')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(await screen.findByRole('link', { name: 'Onboard new hire' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
    const search = screen.getByRole('searchbox', { name: 'Search requests' });
    expect(search).toHaveValue('');
    expect(search).toHaveFocus();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('clears the search when a blank search is submitted', async () => {
    const { calls } = stubSearchableList();
    const { user, router } = renderRoute('/?q=monitor');
    await screen.findByRole('link', { name: 'Replace monitor' });

    const search = screen.getByRole('searchbox', { name: 'Search requests' });
    await user.clear(search);
    await user.type(search, '   {Enter}');

    expect(await screen.findByRole('link', { name: 'Onboard new hire' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
    expect(calls.at(-1)?.url).toBe('/api/requests');
  });

  it('treats a blank q in the URL as no search', async () => {
    const { calls } = stubSearchableList();
    renderRoute('/?q=%20%20');

    expect(await screen.findByRole('link', { name: 'Onboard new hire' })).toBeInTheDocument();
    expect(calls[0]?.url).toBe('/api/requests');
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });

  it('rejects a search longer than 200 characters without calling the API', async () => {
    const { calls } = stubSearchableList();
    const { user, router } = renderRoute('/');
    await screen.findByRole('link', { name: 'Onboard new hire' });

    const search = screen.getByRole('searchbox', { name: 'Search requests' });
    await user.click(search);
    await user.paste('a'.repeat(201));
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(search).toHaveAttribute('aria-invalid', 'true');
    expect(search).toHaveAccessibleDescription(
      'Searches titles and descriptions. Search must be at most 200 characters',
    );
    expect(search).toHaveFocus();
    expect(router.state.location.search).toBe('');
    expect(calls).toHaveLength(1);
  });

  it('retries the current search with "Try again"', async () => {
    let attempts = 0;
    const { calls } = stubFetch(() => {
      attempts += 1;
      return attempts === 1
        ? jsonResponse(500, {
            error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
          })
        : jsonResponse(200, { data: [older] });
    });
    const { user } = renderRoute('/?q=monitor');

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: 'Replace monitor' })).toBeInTheDocument();
    expect(calls.map((call) => call.url)).toEqual([
      '/api/requests?q=monitor',
      '/api/requests?q=monitor',
    ]);
  });
});
