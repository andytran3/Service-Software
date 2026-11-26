import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, pendingResponse, stubFetch } from '../../test/fetch';
import { renderRoute } from '../../test/render';
import type { InternalRequest, RequestStatus } from '../requests/types';

const NOW = new Date('2026-11-26T12:00:00.000Z');

let counter = 0;
function request(title: string, status: RequestStatus, updatedAt: string): InternalRequest {
  counter += 1;
  return {
    id: `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`,
    title,
    description: 'x',
    type: 'IT',
    status,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt,
  };
}

function panel() {
  return screen.getByRole('region', { name: 'Open requests' });
}

beforeEach(() => {
  // A fixed clock for the relative times; real timers keep user events and promises working.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('OpenRequestsPanel', () => {
  it('shows a loading state while the list loads', async () => {
    const { calls } = stubFetch(() => pendingResponse());
    renderRoute('/');

    expect(
      await within(await screen.findByRole('region', { name: 'Open requests' })).findByRole(
        'status',
      ),
    ).toHaveTextContent('Loading open requests…');
    expect(calls.map((call) => call.url)).toEqual(['/api/requests']);
  });

  it('shows open requests that need a reply first, at most five, each as one link', async () => {
    const reply = request(
      'Answer the security question',
      'Needs your reply',
      '2026-11-20T12:00:00.000Z',
    );
    stubFetch(() =>
      jsonResponse(200, {
        data: [
          request('Done already', 'Completed', '2026-11-26T11:59:00.000Z'),
          request('Newest open', 'New', '2026-11-26T10:00:00.000Z'),
          request('Second', 'In Progress', '2026-11-25T12:00:00.000Z'),
          request('Third', 'Awaiting approval', '2026-11-24T12:00:00.000Z'),
          request('Fourth', 'New', '2026-11-23T12:00:00.000Z'),
          request('Too old to fit', 'New', '2026-11-01T12:00:00.000Z'),
          reply,
        ],
      }),
    );
    renderRoute('/');

    const list = await within(
      await screen.findByRole('region', { name: 'Open requests' }),
    ).findByRole('list');
    const links = within(list).getAllByRole('link');
    // Each link starts with the request title.
    expect(links.map((link) => link.querySelector('.font-medium')?.textContent)).toEqual([
      'Answer the security question',
      'Newest open',
      'Second',
      'Third',
      'Fourth',
    ]);
    expect(links[0]).toHaveAttribute('href', `/requests/${reply.id}`);
    expect(links[0]).toHaveTextContent('Needs your reply');
    expect(within(panel()).queryByText('Done already')).not.toBeInTheDocument();
    expect(within(panel()).queryByText('Too old to fit')).not.toBeInTheDocument();
  });

  it('shows when each request was updated, with the full date on hover', async () => {
    const recent = request('Recent', 'New', '2026-11-26T10:00:00.000Z');
    stubFetch(() => jsonResponse(200, { data: [recent] }));
    renderRoute('/');

    const link = await within(
      await screen.findByRole('region', { name: 'Open requests' }),
    ).findByRole('link', { name: /Recent/ });
    const time = link.querySelector('time');
    expect(time).toHaveAttribute('dateTime', recent.updatedAt);
    expect(time?.getAttribute('title')).toBeTruthy();
    expect(link).toHaveTextContent(
      `Updated ${new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-2, 'hour')}`,
    );
  });

  it('shows an empty state with a link to create a request', async () => {
    stubFetch(() =>
      jsonResponse(200, { data: [request('Finished', 'Completed', '2026-11-26T10:00:00.000Z')] }),
    );
    renderRoute('/');

    expect(
      await within(await screen.findByRole('region', { name: 'Open requests' })).findByText(
        /There are no open requests\./,
      ),
    ).toBeInTheDocument();
    expect(within(panel()).getByRole('link', { name: 'Create a request' })).toHaveAttribute(
      'href',
      '/requests/new',
    );
    expect(within(panel()).getByRole('link', { name: 'View all requests' })).toHaveAttribute(
      'href',
      '/requests',
    );
  });

  it('shows an error and recovers with "Try again"', async () => {
    let attempts = 0;
    stubFetch(() => {
      attempts += 1;
      return attempts === 1
        ? jsonResponse(500, {
            error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
          })
        : jsonResponse(200, { data: [request('Back again', 'New', '2026-11-26T11:00:00.000Z')] });
    });
    const { user } = renderRoute('/');

    const alert = await within(
      await screen.findByRole('region', { name: 'Open requests' }),
    ).findByRole('alert');
    expect(alert).toHaveTextContent('Could not load open requests.');
    expect(alert).toHaveTextContent('An unexpected error occurred.');

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await within(panel()).findByRole('link', { name: /Back again/ })).toBeInTheDocument();
  });
});
