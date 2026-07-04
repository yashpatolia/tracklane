import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ApplicationModal from './ApplicationModal.jsx';

describe('ApplicationModal', () => {
  it('saves with Cmd/Ctrl+Enter after required fields are filled', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <ApplicationModal
        initialData={null}
        isEditing={false}
        onSave={onSave}
        onCancel={vi.fn()}
        onDelete={vi.fn()}
        existingApplications={[]}
      />
    );

    await user.type(screen.getByLabelText('Company'), 'Shopify');
    await user.type(screen.getByLabelText('Role'), 'Software Engineer Intern');
    await user.click(screen.getByRole('button', { name: 'Summer' }));
    await user.type(screen.getByLabelText('Applied Date'), '2026-07-04');

    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      company: 'Shopify',
      role: 'Software Engineer Intern',
      season: 'Summer',
      applied: '2026-07-04',
    }));
  });

  it('blocks duplicates and missing required fields', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <ApplicationModal
        initialData={null}
        isEditing={false}
        onSave={onSave}
        onCancel={vi.fn()}
        onDelete={vi.fn()}
        existingApplications={[{ company: 'Shopify', role: 'Software Engineer Intern' }]}
      />
    );

    await user.type(screen.getByLabelText('Company'), 'Shopify');
    await user.type(screen.getByLabelText('Role'), 'Software Engineer Intern');
    await user.type(screen.getByLabelText('Applied Date'), '2026-07-04');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(alertSpy).toHaveBeenCalledWith('An application for this company and role already exists.');
    expect(onSave).not.toHaveBeenCalled();
  });
});
