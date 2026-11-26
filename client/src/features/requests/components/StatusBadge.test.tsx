import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { REQUEST_STATUSES } from '../types';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it.each(REQUEST_STATUSES)('shows the status "%s" as text', (status) => {
    render(<StatusBadge status={status} />);

    expect(screen.getByText(status, { exact: true })).toBeInTheDocument();
  });

  it('gives every status its own colour', () => {
    const classNames = REQUEST_STATUSES.map((status) => {
      const { container, unmount } = render(<StatusBadge status={status} />);
      const className = container.firstElementChild?.className ?? '';
      unmount();
      return className;
    });

    expect(new Set(classNames).size).toBe(REQUEST_STATUSES.length);
  });
});
