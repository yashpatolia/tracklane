import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsModal from './SettingsModal.jsx';
import { claimUsername } from '../friends-api.js';

vi.mock('../friends-api.js', () => ({
  claimUsername: vi.fn(),
}));

describe('SettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('claims a normalized username', async () => {
    const user = userEvent.setup();
    const onUsernameSet = vi.fn();
    claimUsername.mockResolvedValue({ username: 'alice_01' });

    render(
      <SettingsModal
        user={{ email: 'alice@example.com', name: 'Alice', username: null }}
        onClose={vi.fn()}
        onUsernameSet={onUsernameSet}
      />
    );

    await user.type(screen.getByLabelText('Choose username'), 'Alice_01');
    await user.click(screen.getByRole('button', { name: 'Save username' }));

    await waitFor(() => expect(claimUsername).toHaveBeenCalledWith('alice_01'));
    expect(onUsernameSet).toHaveBeenCalledWith('alice_01');
  });

  it('validates username format before saving', async () => {
    const user = userEvent.setup();

    render(
      <SettingsModal
        user={{ email: 'alice@example.com', name: 'Alice', username: null }}
        onClose={vi.fn()}
        onUsernameSet={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText('Choose username'), 'ab');
    await user.click(screen.getByRole('button', { name: 'Save username' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Username must be 3-20 characters');
    expect(claimUsername).not.toHaveBeenCalled();
  });

  it('shows an immutable username once set', () => {
    render(
      <SettingsModal
        user={{ email: 'alice@example.com', name: 'Alice', username: 'alice' }}
        onClose={vi.fn()}
        onUsernameSet={vi.fn()}
      />
    );

    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('Usernames are permanent once set.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save username' })).not.toBeInTheDocument();
  });
});
