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
