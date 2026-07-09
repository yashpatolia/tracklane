import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../friends-api.js', () => ({
  searchUsers: vi.fn(),
  sendFriendRequest: vi.fn(),
  acceptFriendRequest: vi.fn(),
  declineFriendRequest: vi.fn(),
  removeFriendship: vi.fn(),
  fetchFriends: vi.fn(),
  fetchFriendRequests: vi.fn(),
}));

import FriendsView from './FriendsView.jsx';
import {
  acceptFriendRequest,
  fetchFriendRequests,
  fetchFriends,
  removeFriendship,
  searchUsers,
  sendFriendRequest,
} from '../friends-api.js';

describe('FriendsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchFriends.mockResolvedValue([]);
    fetchFriendRequests.mockResolvedValue([]);
    searchUsers.mockResolvedValue([]);
  });

  it('shows a prompt instead of the search UI when the user has no username', () => {
    render(<FriendsView hasUsername={false} />);
    expect(screen.getByText('Set a username first')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search by handle')).not.toBeInTheDocument();
  });

  it('shows empty states for friends and requests once loaded', async () => {
    render(<FriendsView hasUsername />);
    expect(await screen.findByText('No friends yet')).toBeInTheDocument();
    expect(screen.getByText('No pending requests')).toBeInTheDocument();
  });

  it('searches by handle and sends a friend request', async () => {
    searchUsers.mockResolvedValue([
      { id: 2, username: 'bob1', name: 'Bob', friendshipStatus: 'none' },
    ]);
    sendFriendRequest.mockResolvedValue({});
    const user = userEvent.setup();

    render(<FriendsView hasUsername />);
    await user.type(screen.getByPlaceholderText('Search by handle'), 'bob');

    const addButton = await screen.findByRole('button', { name: 'Add' });
    await user.click(addButton);

    expect(sendFriendRequest).toHaveBeenCalledWith(2);
  });

  it('accepts an incoming request', async () => {
    fetchFriendRequests.mockImplementation((direction) =>
      Promise.resolve(
        direction === 'incoming' ? [{ id: 5, user: { id: 3, username: 'carol1', name: 'Carol' } }] : []
      )
    );
    acceptFriendRequest.mockResolvedValue({});
    const user = userEvent.setup();

    render(<FriendsView hasUsername />);
    const acceptButton = await screen.findByRole('button', { name: 'Accept' });
    await user.click(acceptButton);

    expect(acceptFriendRequest).toHaveBeenCalledWith(5);
  });

  it('removes a friend after confirmation', async () => {
    fetchFriends.mockResolvedValue([{ id: 9, user: { id: 4, username: 'dave1', name: 'Dave' } }]);
    removeFriendship.mockResolvedValue({});
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();

    render(<FriendsView hasUsername />);
    const removeButton = await screen.findByTitle('Remove friend');
    await user.click(removeButton);

    expect(removeFriendship).toHaveBeenCalledWith(9);
  });
});
