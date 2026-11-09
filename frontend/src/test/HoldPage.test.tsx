import { screen } from '@testing-library/react';
import { HoldPage } from '../pages/HoldPage';
import { api } from '../api/client';
import { renderRoute, testStudentId } from './renderRoute';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getHold: vi.fn(),
      confirmHold: vi.fn(),
      cancelHold: vi.fn(),
    },
  };
});

const mockedApi = vi.mocked(api);

function holdExpiringAt(offsetMilliseconds: number) {
  return {
    holdId: 'h_1',
    classId: 'c_1',
    studentId: testStudentId,
    status: 'HELD' as const,
    expiresAt: new Date(Date.now() + offsetMilliseconds).toISOString(),
  };
}

describe('application page', () => {
  beforeEach(() => {
    localStorage.setItem('school-admission.studentId', testStudentId);
    vi.clearAllMocks();
  });

  it('disables payment when the hold has already expired', async () => {
    mockedApi.getHold.mockResolvedValue(holdExpiringAt(-5_000));

    renderRoute('/holds/:holdId', '/holds/h_1', <HoldPage />);

    const pay = await screen.findByRole('button', { name: 'ভর্তি ফি দিন' });

    expect(pay).toBeDisabled();
    expect(screen.getByText('মেয়াদ শেষ')).toBeInTheDocument();
  });

  it('keeps payment available while time is left', async () => {
    mockedApi.getHold.mockResolvedValue(holdExpiringAt(120_000));

    renderRoute('/holds/:holdId', '/holds/h_1', <HoldPage />);

    const pay = await screen.findByRole('button', { name: 'ভর্তি ফি দিন' });

    expect(pay).toBeEnabled();
    expect(screen.getByText('বাকি সময়')).toBeInTheDocument();
  });
});
