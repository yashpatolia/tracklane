import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ApplicationsTable from './ApplicationsTable.jsx';

describe('ApplicationsTable', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('uses the original row index after sorting for edit, status, and delete actions', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onAdvanceStatus = vi.fn();
    const onDelete = vi.fn();

    render(
      <ApplicationsTable
        applications={[
          {
            company: 'Acme',
            role: 'Intern',
            season: 'Summer',
            status: 'Applied',
            stack: 'Vue',
            comp: '32',
            applied: '2026-07-04',
            nextAction: '',
            nextActionDue: '',
            updatedAt: '2026-07-04T00:00:00.000Z',
            notes: '',
          },
          {
            company: 'Beta',
            role: 'Intern',
            season: 'Fall',
            status: 'Interview',
            stack: 'React',
            comp: '34',
            applied: '2026-07-03',
            nextAction: '',
            nextActionDue: '',
            updatedAt: '2026-07-03T00:00:00.000Z',
            notes: '',
          },
        ]}
        onEdit={onEdit}
        onDelete={onDelete}
        onAdvanceStatus={onAdvanceStatus}
      />
    );

    const sortButton = screen.getByRole('button', { name: /sort by stack/i });
    sortButton.focus();
    await user.keyboard('{Enter}');

    await user.click(screen.getByText('Beta'));
    expect(onEdit).toHaveBeenCalledWith(1);

    await user.click(screen.getByRole('button', { name: /advance status: interview/i }));
    expect(onAdvanceStatus).toHaveBeenCalledWith(1);

    await user.click(screen.getAllByTitle('Delete')[0]);
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('uses the original row index after sorting for the archive action', async () => {
    const user = userEvent.setup();
    const onArchive = vi.fn();

    render(
      <ApplicationsTable
        applications={[
          {
            company: 'Acme',
            role: 'Intern',
            season: 'Summer',
            status: 'Applied',
            stack: 'Vue',
            comp: '32',
            applied: '2026-07-04',
            nextAction: '',
            nextActionDue: '',
            updatedAt: '2026-07-04T00:00:00.000Z',
            notes: '',
            archived: false,
          },
          {
            company: 'Beta',
            role: 'Intern',
            season: 'Fall',
            status: 'Interview',
            stack: 'React',
            comp: '34',
            applied: '2026-07-03',
            nextAction: '',
            nextActionDue: '',
            updatedAt: '2026-07-03T00:00:00.000Z',
            notes: '',
            archived: false,
          },
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAdvanceStatus={vi.fn()}
        onArchive={onArchive}
      />
    );

    const sortButton = screen.getByRole('button', { name: /sort by stack/i });
    sortButton.focus();
    await user.keyboard('{Enter}');

    await user.click(screen.getAllByTitle('Archive')[0]);
    expect(onArchive).toHaveBeenCalledWith(1);
  });

  it('shows Unarchive for already-archived rows and dims them', () => {
    render(
      <ApplicationsTable
        applications={[
          {
            company: 'Acme',
            role: 'Intern',
            season: 'Summer',
            status: 'Rejected',
            stack: '',
            comp: '',
            applied: '2026-07-04',
            nextAction: '',
            nextActionDue: '',
            updatedAt: '2026-07-04T00:00:00.000Z',
            notes: '',
            archived: true,
          },
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAdvanceStatus={vi.fn()}
        onArchive={vi.fn()}
      />
    );

    expect(screen.getByTitle('Unarchive')).toBeInTheDocument();
    expect(screen.getByText('Acme').closest('tr')).toHaveClass('status-row--archived');
  });

  it('lets users hide low-value columns', async () => {
    const user = userEvent.setup();

    render(
      <ApplicationsTable
        applications={[
          {
            company: 'Shopify',
            role: 'Intern',
            season: 'Summer',
            status: 'Applied',
            stack: 'React',
            comp: '32',
            applied: '2026-07-04',
            nextAction: 'Follow up',
            nextActionDue: '2026-07-06',
            updatedAt: '2026-07-04T00:00:00.000Z',
            notes: 'Referral',
          },
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAdvanceStatus={vi.fn()}
      />
    );

    expect(screen.getByText('React')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Stack', pressed: true }));
    expect(screen.queryByText('React')).not.toBeInTheDocument();
  });

  it('shows a contextual empty state when a filter has no matches', () => {
    render(
      <ApplicationsTable
        applications={[]}
        activeFilter="Interview"
        onFilterClear={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAdvanceStatus={vi.fn()}
      />
    );

    expect(screen.getByText(/No interview applications yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear filter/i })).toBeInTheDocument();
  });

  it('highlights overdue follow-ups', async () => {
    const user = userEvent.setup();

    render(
      <ApplicationsTable
        applications={[
          {
            company: 'Shopify',
            role: 'Intern',
            season: 'Summer',
            status: 'Applied',
            stack: '',
            comp: '',
            applied: '2026-07-04',
            nextAction: 'Follow up',
            nextActionDue: '2026-07-01',
            updatedAt: '2026-07-04T00:00:00.000Z',
            notes: '',
          },
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAdvanceStatus={vi.fn()}
      />
    );

    // Next Action is hidden by default; turn it on before checking the badge.
    await user.click(screen.getByRole('button', { name: 'Next Action', pressed: false }));

    expect(screen.getByText(/Follow up/i)).toHaveClass('deadline-overdue');
  });
});
