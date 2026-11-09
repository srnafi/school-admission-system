import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, api } from '../api/client';
import { ClassesPage } from '../pages/ClassesPage';
import { renderRoute, testStudentId } from './renderRoute';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      listClasses: vi.fn(),
      createClass: vi.fn(),
      createHold: vi.fn(),
    },
  };
});

const mockedApi = vi.mocked(api);

describe('class list', () => {
  beforeEach(() => {
    localStorage.setItem('school-admission.studentId', testStudentId);
    vi.clearAllMocks();
    mockedApi.listClasses.mockResolvedValue([
      {
        id: 'c_1',
        name: 'Class 6 - Morning Shift',
        totalSeats: 2,
        heldSeats: 1,
        confirmedSeats: 0,
        availableSeats: 1,
      },
    ]);
  });

  it('shows the seat counts for a class', async () => {
    renderRoute('/', '/', <ClassesPage />);

    expect(await screen.findByText('Class 6 - Morning Shift')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'আবেদন করুন' })).toBeEnabled();
  });

  it('explains a seat conflict in plain language', async () => {
    mockedApi.createHold.mockRejectedValue(new ApiError(409, 'NO_SEATS', 'No seat available.'));

    renderRoute('/', '/', <ClassesPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'আবেদন করুন' }));

    await waitFor(() => expect(screen.getByText('সিট শেষ হয়ে গেছে')).toBeInTheDocument());
  });
});
