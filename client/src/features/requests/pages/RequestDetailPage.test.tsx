import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { jsonResponse, pendingResponse, stubFetch } from '../../../test/fetch';
import { renderRoute } from '../../../test/render';
import type { InternalRequest } from '../types';

const request: InternalRequest = {
  id: '17918d78-824a-4810-af53-4e55b7d4493c',
  title: 'Replace monitor',
  description: 'Flickers on startup.\nSecond line.',
  type: 'Facilities',
  status: 'New',
  createdAt: '2026-11-24T09:00:00.000Z',
  updatedAt: '2026-11-24T09:30:00.000Z',
};

const detailPath = `/requests/${request.id}`;
const notFoundBody = { error: { code: 'NOT_FOUND', message: 'Request not found.' } };
const serverErrorBody = {
  error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
};

describe('RequestDetailPage', () => {
  it('loads the request by id and shows a loading state', async () => {
    const { calls } = stubFetch(() => pendingResponse());

    renderRoute(detailPath);

    expect(await screen.findByRole('status')).toHaveTextContent('Loading request…');
    expect(calls[0]).toMatchObject({ url: `/api/requests/${request.id}`, method: 'GET' });
  });

  it('shows every field of the request', async () => {
    stubFetch(() => jsonResponse(200, { data: request }));

    renderRoute(detailPath);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Replace monitor' }),
    ).toBeInTheDocument();
    const article = screen.getByRole('article');
    const term = (name: string) => within(article).getByText(name, { selector: 'dt' });
    expect(term('Type').nextElementSibling).toHaveTextContent('Facilities');
    expect(term('Status').nextElementSibling).toHaveTextContent('New');
    expect(term('Description').nextElementSibling).toHaveTextContent(
      'Flickers on startup. Second line.',
    );
    expect(term('Created').nextElementSibling?.querySelector('time')).toHaveAttribute(
      'dateTime',
      request.createdAt,
    );
    expect(term('Last updated').nextElementSibling?.querySelector('time')).toHaveAttribute(
      'dateTime',
      request.updatedAt,
    );
    expect(screen.getByRole('link', { name: '← Back to requests' })).toHaveAttribute('href', '/');
  });

  it('shows "Request not found" for a 404 without retrying', async () => {
    const { calls } = stubFetch(() => jsonResponse(404, notFoundBody));

    renderRoute('/requests/not-a-real-id');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Request not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Back to requests' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(calls).toHaveLength(1);
  });

  it('shows an error for other failures and recovers with "Try again"', async () => {
    let attempts = 0;
    stubFetch(() => {
      attempts += 1;
      return attempts === 1
        ? jsonResponse(500, serverErrorBody)
        : jsonResponse(200, { data: request });
    });
    const { user } = renderRoute(detailPath);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load this request.');
    expect(alert).toHaveTextContent('An unexpected error occurred.');

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Replace monitor' }),
    ).toBeInTheDocument();
  });

  it('preselects the current status and enables the button only after a change', async () => {
    stubFetch(() => jsonResponse(200, { data: request }));
    const { user } = renderRoute(detailPath);

    const select = await screen.findByRole('combobox', { name: 'Status' });
    const button = screen.getByRole('button', { name: 'Update status' });
    expect(select).toHaveValue('New');
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['New', 'Awaiting approval', 'In Progress', 'Needs your reply', 'Completed']);
    expect(button).toBeDisabled();

    await user.selectOptions(select, 'In Progress');

    expect(button).toBeEnabled();
  });

  it('updates the status, shows the new value, and announces success', async () => {
    const updated: InternalRequest = {
      ...request,
      status: 'In Progress',
      updatedAt: '2026-11-25T08:00:00.000Z',
    };
    const { calls } = stubFetch((call) =>
      call.method === 'PATCH'
        ? jsonResponse(200, { data: updated })
        : jsonResponse(200, { data: request }),
    );
    const { user } = renderRoute(detailPath);

    const select = await screen.findByRole('combobox', { name: 'Status' });
    await user.selectOptions(select, 'In Progress');
    await user.click(screen.getByRole('button', { name: 'Update status' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Status updated to In Progress.');
    expect(calls.find((call) => call.method === 'PATCH')).toEqual({
      url: `/api/requests/${request.id}/status`,
      method: 'PATCH',
      body: { status: 'In Progress' },
    });
    const article = screen.getByRole('article');
    expect(
      within(article).getByText('Status', { selector: 'dt' }).nextElementSibling,
    ).toHaveTextContent('In Progress');
    expect(
      within(article)
        .getByText('Last updated', { selector: 'dt' })
        .nextElementSibling?.querySelector('time'),
    ).toHaveAttribute('dateTime', updated.updatedAt);
    expect(select).toHaveValue('In Progress');
    expect(screen.getByRole('button', { name: 'Update status' })).toBeDisabled();
  });

  it('updates the status to "Needs your reply"', async () => {
    const updated: InternalRequest = {
      ...request,
      status: 'Needs your reply',
      updatedAt: '2026-11-25T08:00:00.000Z',
    };
    const { calls } = stubFetch((call) =>
      call.method === 'PATCH'
        ? jsonResponse(200, { data: updated })
        : jsonResponse(200, { data: request }),
    );
    const { user } = renderRoute(detailPath);

    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Status' }),
      'Needs your reply',
    );
    await user.click(screen.getByRole('button', { name: 'Update status' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Status updated to Needs your reply.',
    );
    expect(calls.find((call) => call.method === 'PATCH')?.body).toEqual({
      status: 'Needs your reply',
    });
    expect(
      within(screen.getByRole('article')).getByText('Status', { selector: 'dt' })
        .nextElementSibling,
    ).toHaveTextContent('Needs your reply');
  });

  it('disables the button while the update is in progress', async () => {
    stubFetch((call) =>
      call.method === 'PATCH' ? pendingResponse() : jsonResponse(200, { data: request }),
    );
    const { user } = renderRoute(detailPath);

    await user.selectOptions(await screen.findByRole('combobox', { name: 'Status' }), 'Completed');
    await user.click(screen.getByRole('button', { name: 'Update status' }));

    expect(await screen.findByRole('button', { name: 'Updating…' })).toBeDisabled();
  });

  it('shows an error when the update fails and keeps the chosen status', async () => {
    stubFetch((call) =>
      call.method === 'PATCH'
        ? jsonResponse(500, serverErrorBody)
        : jsonResponse(200, { data: request }),
    );
    const { user } = renderRoute(detailPath);

    const select = await screen.findByRole('combobox', { name: 'Status' });
    await user.selectOptions(select, 'Completed');
    await user.click(screen.getByRole('button', { name: 'Update status' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not update the status.');
    expect(alert).toHaveTextContent('An unexpected error occurred.');
    expect(select).toHaveValue('Completed');
    expect(screen.getByRole('button', { name: 'Update status' })).toBeEnabled();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('announces "Request created" after creating a request, then clears the history state', async () => {
    stubFetch((call) =>
      call.method === 'POST'
        ? jsonResponse(201, { data: request })
        : jsonResponse(200, { data: request }),
    );
    const { user, router } = renderRoute('/requests/new');

    await user.type(screen.getByRole('textbox', { name: 'Title' }), request.title);
    await user.type(screen.getByRole('textbox', { name: 'Description' }), 'Flickers.');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Type' }), 'Facilities');
    await user.click(screen.getByRole('button', { name: 'Create request' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Replace monitor' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Request created.');
    await waitFor(() => expect(router.state.location.state).toBeNull());
    expect(router.state.location.pathname).toBe(detailPath);
    expect(screen.getByRole('status')).toHaveTextContent('Request created.');
  });
});
