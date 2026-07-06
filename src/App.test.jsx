import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api.js', () => ({
  fetchApplications: vi.fn().mockResolvedValue([]),
  fetchMe: vi.fn().mockResolvedValue({ id: 1, email: 'test@example.com', name: 'Test User' }),
  logout: vi.fn().mockResolvedValue(undefined),
  saveApplications: vi.fn().mockResolvedValue(undefined),
}));

import App from './App.jsx';
import { saveApplications } from './api.js';

describe('App shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function localDayString(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  it('opens the new entry modal from the keyboard shortcut', async () => {
    const user = userEvent.setup();

    render(
      <App
        initialUser={{ id: 1, email: 'test@example.com', name: 'Test User', avatarUrl: '' }}
        initialApplications={[]}
      />
    );

    await screen.findByRole('button', { name: '+ New Entry' });
    await user.keyboard('{Control>}{Alt>}{N}{/Alt}{/Control}');

    expect(screen.getByRole('heading', { name: 'Add Application' })).toBeInTheDocument();
  });

  it('does not backfill applied for draft entries', async () => {
    const user = userEvent.setup();

    render(
      <App
        initialUser={{ id: 1, email: 'test@example.com', name: 'Test User', avatarUrl: '' }}
        initialApplications={[]}
      />
    );

    await user.click(screen.getByRole('button', { name: '+ New Entry' }));
    await user.type(screen.getByLabelText('Company'), 'Shopify');
    await user.type(screen.getByLabelText('Role'), 'Software Engineer Intern');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(saveApplications).toHaveBeenCalledWith([
      expect.objectContaining({
        company: 'Shopify',
        role: 'Software Engineer Intern',
        status: 'Not Applied',
        applied: '',
      }),
    ]);
  });

  it('backfills applied when saving an active new entry', async () => {
    const user = userEvent.setup();
    const expectedApplied = localDayString();

    render(
      <App
        initialUser={{ id: 1, email: 'test@example.com', name: 'Test User', avatarUrl: '' }}
        initialApplications={[]}
      />
    );

    await user.click(screen.getByRole('button', { name: '+ New Entry' }));
    await user.type(screen.getByLabelText('Company'), 'Shopify');
    await user.type(screen.getByLabelText('Role'), 'Software Engineer Intern');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Applied');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(saveApplications).toHaveBeenCalledWith([
      expect.objectContaining({
        company: 'Shopify',
        role: 'Software Engineer Intern',
        status: 'Applied',
        applied: expectedApplied,
      }),
    ]);
  });
});
