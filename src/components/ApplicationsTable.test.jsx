import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ApplicationsTable from './ApplicationsTable.jsx';

describe('ApplicationsTable', () => {
  it('advances status by clicking the status chip', async () => {
    const user = userEvent.setup();
    const onAdvanceStatus = vi.fn();

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
            nextAction: '',
            nextActionDue: '',
            updatedAt: '2026-07-04T00:00:00.000Z',
            notes: '',
          },
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAdvanceStatus={onAdvanceStatus}
      />
    );

    await user.click(screen.getByRole('button', { name: /advance status: applied/i }));
    expect(onAdvanceStatus).toHaveBeenCalledWith(0);
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
    await user.click(screen.getByRole('button', { name: /stack/i }));
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

  it('highlights overdue follow-ups', () => {
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

    expect(screen.getByText(/Follow up/i)).toHaveClass('deadline-overdue');
  });
});
