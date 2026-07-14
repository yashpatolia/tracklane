import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api.js', () => ({
  fetchApplications: vi.fn().mockResolvedValue([]),
  fetchMe: vi.fn().mockResolvedValue({ email: 'test@example.com', name: 'Test User', username: null }),
  logout: vi.fn().mockResolvedValue(undefined),
  saveApplications: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./friends-api.js', () => ({
  acceptFriendRequest: vi.fn().mockResolvedValue({ ok: true }),
  cancelFriendRequest: vi.fn().mockResolvedValue({ ok: true }),
  claimUsername: vi.fn().mockResolvedValue({ username: 'test_user' }),
  declineFriendRequest: vi.fn().mockResolvedValue({ ok: true }),
  fetchFriends: vi.fn().mockResolvedValue({ incoming: [], outgoing: [], accepted: [] }),
  searchUsername: vi.fn().mockResolvedValue({ username: 'friend' }),
  sendFriendRequest: vi.fn().mockResolvedValue({ ok: true }),
}));

import App from './App.jsx';
import { saveApplications } from './api.js';
import { fetchFriends } from './friends-api.js';

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

  it('shows the username gate until a username exists', async () => {
    const user = userEvent.setup();
    render(
      <App
        initialUser={{ email: 'test@example.com', name: 'Test User', avatarUrl: '', username: null }}
        initialApplications={[]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Friends' }));

    expect(screen.getByText('Set your username to find friends and send friend requests.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Friends' })).not.toBeInTheDocument();
  });

  it('loads Friends when the user has a username', async () => {
    const user = userEvent.setup();
    render(
      <App
        initialUser={{ email: 'test@example.com', name: 'Test User', avatarUrl: '', username: 'test_user' }}
        initialApplications={[]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Friends' }));

    expect(await screen.findByRole('heading', { name: 'Friends' })).toBeInTheDocument();
    expect(fetchFriends).toHaveBeenCalled();
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

  it('archives a row, hides it by default, and reveals it via Show Archived', async () => {
    const user = userEvent.setup();

    render(
      <App
        initialUser={{ id: 1, email: 'test@example.com', name: 'Test User', avatarUrl: '' }}
        initialApplications={[
          { company: 'Acme', role: 'Intern', status: 'Rejected', applied: '2026-07-01', archived: false },
        ]}
      />
    );

    await screen.findByText('Acme');
    await user.click(screen.getByTitle('Archive'));

    expect(saveApplications).toHaveBeenCalledWith([
      expect.objectContaining({ company: 'Acme', archived: true }),
    ]);
    expect(screen.queryByText('Acme')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show Archived' }));
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });

  it('does not persist a new entry when pressing Enter in job posting link', async () => {
    const user = userEvent.setup();

    render(
      <App
        initialUser={{ id: 1, email: 'test@example.com', name: 'Test User', avatarUrl: '' }}
        initialApplications={[]}
      />
    );

    await user.click(screen.getByRole('button', { name: '+ New Entry' }));
    await user.type(screen.getByLabelText('Company'), 'Acme');
    await user.type(screen.getByLabelText('Role'), 'Software Engineer Intern');
    await user.click(screen.getByRole('button', { name: 'Summer' }));
    await user.type(screen.getByLabelText('Job posting link'), 'https://example.com/jobs/1');
    await user.keyboard('{Enter}');

    expect(saveApplications).not.toHaveBeenCalled();
    expect(screen.queryByText('Acme')).not.toBeInTheDocument();
  });
});
