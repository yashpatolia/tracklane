import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api.js', () => ({
  fetchApplications: vi.fn().mockResolvedValue([]),
  fetchMe: vi.fn().mockResolvedValue({ id: 1, email: 'test@example.com', name: 'Test User' }),
  logout: vi.fn().mockResolvedValue(undefined),
  saveApplications: vi.fn().mockResolvedValue(undefined),
}));

import App from './App.jsx';

describe('App shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
});
