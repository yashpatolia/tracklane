import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../friends-api.js', () => ({
  checkUsername: vi.fn(),
  setUsername: vi.fn(),
}));

import SettingsModal from './SettingsModal.jsx';
import { checkUsername, setUsername } from '../friends-api.js';

describe('SettingsModal', () => {
  it('disables Save until a checked, available username is entered', async () => {
    checkUsername.mockResolvedValue({ available: true });
    const user = userEvent.setup();

    render(<SettingsModal user={{ username: null }} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.type(screen.getByLabelText('Handle'), 'newhandle');

    expect(await screen.findByText('Available.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('shows the taken reason and keeps Save disabled when unavailable', async () => {
    checkUsername.mockResolvedValue({ available: false, reason: 'That username is already taken.' });
    const user = userEvent.setup();

    render(<SettingsModal user={{ username: null }} onSave={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Handle'), 'taken');

    expect(await screen.findByText('That username is already taken.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('saves the username and calls onSave with the result', async () => {
    checkUsername.mockResolvedValue({ available: true });
    setUsername.mockResolvedValue({ username: 'newhandle' });
    const onSave = vi.fn();
    const user = userEvent.setup();

    render(<SettingsModal user={{ username: null }} onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Handle'), 'newhandle');
    await screen.findByText('Available.');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(setUsername).toHaveBeenCalledWith('newhandle');
    expect(onSave).toHaveBeenCalledWith('newhandle');
  });

  it('closes on Escape', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(<SettingsModal user={{ username: null }} onSave={vi.fn()} onCancel={onCancel} />);
    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalled();
  });
});
