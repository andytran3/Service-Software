import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { jsonResponse, pendingResponse, stubFetch } from '../../../test/fetch';
import { renderRoute } from '../../../test/render';
import type { InternalRequest } from '../types';

const created: InternalRequest = {
  id: '17918d78-824a-4810-af53-4e55b7d4493c',
  title: 'Replace monitor',
  description: 'Flickers on startup.',
  type: 'Facilities',
  status: 'New',
  createdAt: '2026-11-25T09:00:00.000Z',
  updatedAt: '2026-11-25T09:00:00.000Z',
};

function fields() {
  return {
    title: screen.getByRole('textbox', { name: 'Title' }),
    description: screen.getByRole('textbox', { name: 'Description' }),
    type: screen.getByRole('combobox', { name: 'Type' }),
    submit: screen.getByRole('button', { name: 'Create request' }),
  };
}

describe('NewRequestPage', () => {
  it('renders a labelled form with every request type', () => {
    stubFetch(() => pendingResponse());
    renderRoute('/requests/new');

    expect(screen.getByRole('heading', { level: 1, name: 'New request' })).toBeInTheDocument();
    const { title, description, type } = fields();
    expect(title).toHaveAccessibleDescription('Up to 200 characters.');
    expect(description).toHaveAccessibleDescription('Up to 5000 characters.');
    expect(
      within(type)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Select a type', 'IT', 'Facilities', 'HR', 'Other']);
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/requests');
  });

  it.each(['IT', 'Facilities', 'HR', 'Other'])('preselects the type from ?type=%s', (type) => {
    stubFetch(() => pendingResponse());
    renderRoute(`/requests/new?type=${type}`);

    expect(fields().type).toHaveValue(type);
    expect(fields().title).toHaveValue('');
  });

  it.each(['bogus', 'it', ''])('ignores an unknown type in the URL (%j)', (type) => {
    stubFetch(() => pendingResponse());
    renderRoute(`/requests/new?type=${type}`);

    expect(fields().type).toHaveValue('');
  });

  it('shows required-field errors without calling the API and focuses the first one', async () => {
    const { calls } = stubFetch(() => pendingResponse());
    const { user } = renderRoute('/requests/new');
    const { title, description, type, submit } = fields();

    await user.type(title, '   ');
    await user.click(submit);

    expect(calls).toHaveLength(0);
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription('Up to 200 characters. Title is required');
    expect(description).toHaveAccessibleDescription(
      'Up to 5000 characters. Description is required',
    );
    expect(type).toHaveAccessibleDescription('Select a request type');
    expect(title).toHaveFocus();
  });

  it('enforces the length limits before submitting', async () => {
    const { calls } = stubFetch(() => pendingResponse());
    const { user } = renderRoute('/requests/new');
    const { title, description, type, submit } = fields();

    await user.click(title);
    await user.paste('a'.repeat(201));
    await user.click(description);
    await user.paste('b'.repeat(5001));
    await user.selectOptions(type, 'IT');
    await user.click(submit);

    expect(calls).toHaveLength(0);
    expect(screen.getByText('Title must be at most 200 characters')).toBeInTheDocument();
    expect(screen.getByText('Description must be at most 5000 characters')).toBeInTheDocument();
    expect(type).not.toHaveAttribute('aria-invalid');
  });

  it('submits trimmed values and opens the new request', async () => {
    const { calls } = stubFetch(() => jsonResponse(201, { data: created }));
    const { user, router } = renderRoute('/requests/new');
    const { title, description, type, submit } = fields();

    await user.type(title, '  Replace monitor  ');
    await user.type(description, 'Flickers on startup.');
    await user.selectOptions(type, 'Facilities');
    await user.click(submit);

    await waitFor(() => expect(router.state.location.pathname).toBe(`/requests/${created.id}`));
    // The detail page may refresh the request afterwards; only one POST must be sent.
    expect(calls.filter((call) => call.method === 'POST')).toEqual([
      {
        url: '/api/requests',
        method: 'POST',
        body: { title: 'Replace monitor', description: 'Flickers on startup.', type: 'Facilities' },
      },
    ]);
  });

  it('disables the submit button while the request is being created', async () => {
    stubFetch(() => pendingResponse());
    const { user } = renderRoute('/requests/new');
    const { title, description, type, submit } = fields();

    await user.type(title, 'Replace monitor');
    await user.type(description, 'Flickers.');
    await user.selectOptions(type, 'IT');
    await user.click(submit);

    expect(await screen.findByRole('button', { name: 'Creating…' })).toBeDisabled();
  });

  it('shows server validation errors next to the matching fields', async () => {
    stubFetch(() =>
      jsonResponse(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The request is invalid.',
          details: [
            { path: 'description', message: 'Description must be at most 5000 characters' },
            { path: 'priority', message: 'Unknown field "priority"' },
          ],
        },
      }),
    );
    const { user, router } = renderRoute('/requests/new');
    const { title, description, type, submit } = fields();

    await user.type(title, 'Replace monitor');
    await user.type(description, 'Flickers.');
    await user.selectOptions(type, 'IT');
    await user.click(submit);

    expect(
      await screen.findByText('Description must be at most 5000 characters'),
    ).toBeInTheDocument();
    expect(description).toHaveAttribute('aria-invalid', 'true');
    expect(description).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent('Unknown field "priority"');
    expect(router.state.location.pathname).toBe('/requests/new');
    expect(submit).toBeEnabled();
  });

  it('shows a form-level alert for other failures and keeps the entered values', async () => {
    stubFetch(() =>
      jsonResponse(500, {
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      }),
    );
    const { user } = renderRoute('/requests/new');
    const { title, description, type, submit } = fields();

    await user.type(title, 'Replace monitor');
    await user.type(description, 'Flickers.');
    await user.selectOptions(type, 'HR');
    await user.click(submit);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not create the request.');
    expect(alert).toHaveTextContent('An unexpected error occurred.');
    expect(title).toHaveValue('Replace monitor');
    expect(type).toHaveValue('HR');
  });
});
