import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FriendsView from './FriendsView.jsx';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  fetchFriends,
  searchUsername,
  sendFriendRequest,
} from '../friends-api.js';

vi.mock('../friends-api.js', () => ({
  acceptFriendRequest: vi.fn(),
  cancelFriendRequest: vi.fn(),
  declineFriendRequest: vi.fn(),
  fetchFriends: vi.fn(),
  searchUsername: vi.fn(),
  sendFriendRequest: vi.fn(),
}));

describe('FriendsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchFriends.mockResolvedValue({ incoming: [], outgoing: [], accepted: [] });
  });

  it('loads and displays incoming, outgoing, and accepted friends', async () => {
    fetchFriends.mockResolvedValue({
      incoming: [{ id: 1, username: 'alice' }],
      outgoing: [{ id: 2, username: 'bob' }],
      accepted: [{ id: 3, username: 'carol' }],
    });

    render(<FriendsView />);

    expect(await screen.findByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('@bob')).toBeInTheDocument();
    expect(screen.getByText('@carol')).toBeInTheDocument();
  });

  it('searches for a username and sends a friend request', async () => {
    const user = userEvent.setup();
    searchUsername.mockResolvedValue({ username: 'erin' });
    sendFriendRequest.mockResolvedValue({ ok: true });

    render(<FriendsView />);
    await waitFor(() => expect(fetchFriends).toHaveBeenCalled());

    await user.type(screen.getByLabelText('Search username'), 'erin');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('@erin')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(sendFriendRequest).toHaveBeenCalledWith('erin'));
    expect(fetchFriends).toHaveBeenCalledTimes(2);
  });

  it('accepts, declines, and cancels requests', async () => {
    const user = userEvent.setup();
    fetchFriends.mockResolvedValue({
      incoming: [{ id: 1, username: 'alice' }, { id: 2, username: 'bob' }],
      outgoing: [{ id: 3, username: 'carol' }],
      accepted: [],
    });
    acceptFriendRequest.mockResolvedValue({ ok: true });
    declineFriendRequest.mockResolvedValue({ ok: true });
    cancelFriendRequest.mockResolvedValue({ ok: true });

    render(<FriendsView />);
    expect(await screen.findByText('@alice')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Accept' })[0]);
    await user.click(screen.getAllByRole('button', { name: 'Decline' })[1]);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(acceptFriendRequest).toHaveBeenCalledWith(1));
    expect(declineFriendRequest).toHaveBeenCalledWith(2);
    expect(cancelFriendRequest).toHaveBeenCalledWith(3);
  });
});
