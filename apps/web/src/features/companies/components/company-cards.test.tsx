import { render, screen } from '@testing-library/react';
import { CompanyReview } from './company-cards';

const idle = {
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false,
};

function renderReview(status: 'PENDING' | 'APPROVED' | 'REJECTED') {
  render(
    <CompanyReview
      company={{ companyName: 'Acme Log', status }}
      rows={[{ label: 'Document', value: '12.345.678/0001-90' }]}
      back={{ href: '/admin/sellers', label: 'Sellers' }}
      approve={idle}
      reject={idle}
    />,
  );
}

describe('CompanyReview', () => {
  it('asks for a decision while the application is pending', () => {
    renderReview('PENDING');

    expect(screen.getByRole('status')).toHaveTextContent(
      'Review the company details before deciding.',
    );
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled();
  });

  it.each([
    ['APPROVED', 'This application was approved.'],
    ['REJECTED', 'This application was rejected.'],
  ] as const)(
    'replaces the prompt and the buttons with the outcome once %s',
    (status, outcome) => {
      renderReview(status);

      expect(screen.getByRole('status')).toHaveTextContent(outcome);
      expect(screen.queryByRole('button')).toBeNull();
    },
  );
});
