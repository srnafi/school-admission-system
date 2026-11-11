import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const STUDENT_ID = '20152691234590001';

const classDto = {
  id: 'c1',
  name: 'Class 6 - Morning Shift',
  totalSeats: 40,
  heldSeats: 0,
  confirmedSeats: 0,
  availableSeats: 40,
};

const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('admission desk', () => {
  it('holds a seat and confirms it after payment', async () => {
    let applied = false;
    let status: 'HELD' | 'CONFIRMED' = 'HELD';

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();

      if (url.endsWith('/me/holds')) {
        if (!applied) {
          return json([]);
        }

        return json([
          {
            holdId: 'h1',
            classId: 'c1',
            className: classDto.name,
            status,
            expiresAt,
          },
        ]);
      }

      if (url.includes('/classes/c1/holds') && method === 'POST') {
        applied = true;
        return json(
          { holdId: 'h1', classId: 'c1', studentId: STUDENT_ID, status: 'HELD', expiresAt },
          201,
        );
      }

      if (url.includes('/holds/h1/confirm') && method === 'POST') {
        status = 'CONFIRMED';
        return json({ holdId: 'h1', status: 'CONFIRMED' });
      }

      if (url.endsWith('/classes') && method === 'GET') {
        return json([
          {
            ...classDto,
            heldSeats: applied && status === 'HELD' ? 1 : 0,
            confirmedSeats: applied && status === 'CONFIRMED' ? 1 : 0,
            availableSeats: applied ? 39 : 40,
          },
        ]);
      }

      return json({ error: { code: 'UNKNOWN_ERROR', message: 'unexpected call' } }, 500);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByText('Class 6 - Morning Shift')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('17-digit Birth Registration No.'), {
      target: { value: STUDENT_ID },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Apply Now' }));

    expect(await screen.findByText('Application Status')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Pay Admission Fee/i }));

    expect(await screen.findByText('Admission confirmed')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/holds/h1/confirm'),
      expect.objectContaining({ method: 'POST' }),
    );

    const dismiss = screen.getAllByRole('button', { name: 'Dismiss notification' });
    fireEvent.click(dismiss[0]);

    await waitFor(() => {
      expect(screen.queryByText(/Seat held/)).not.toBeInTheDocument();
    });
  });

  it('marks a class with no seats left as full', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).endsWith('/classes')) {
          return json([{ ...classDto, heldSeats: 40, availableSeats: 0 }]);
        }

        return json([]);
      }),
    );

    render(<App />);

    expect(await screen.findByRole('button', { name: 'Class Full' })).toBeDisabled();
  });

  it('creates a class from the admin tab', async () => {
    const classes = [{ ...classDto }];

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();

      if (url.endsWith('/classes') && method === 'POST') {
        const body = JSON.parse(String(init?.body)) as { name: string; totalSeats: number };
        const created = {
          id: 'c2',
          name: body.name,
          totalSeats: body.totalSeats,
          heldSeats: 0,
          confirmedSeats: 0,
          availableSeats: body.totalSeats,
        };
        classes.push(created);
        return json(created, 201);
      }

      if (url.endsWith('/classes')) {
        return json(classes);
      }

      return json([]);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Admin' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add a custom class instead' }));
    fireEvent.change(screen.getByLabelText('Class name'), {
      target: { value: 'Class 9 - Science' },
    });
    fireEvent.change(screen.getByLabelText('Total seats'), { target: { value: '32' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create custom class' }));

    expect(await screen.findByText('Class 9 - Science')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/classes$/),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('creates a class from the class and shift pickers', async () => {
    const classes: (typeof classDto)[] = [];

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();

      if (url.endsWith('/classes') && method === 'POST') {
        const body = JSON.parse(String(init?.body)) as { name: string; totalSeats: number };
        const created = {
          id: 'c2',
          name: body.name,
          totalSeats: body.totalSeats,
          heldSeats: 0,
          confirmedSeats: 0,
          availableSeats: body.totalSeats,
        };
        classes.push(created);
        return json(created, 201);
      }

      if (url.endsWith('/classes')) {
        return json(classes);
      }

      return json([]);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Admin' }));
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Shift'), { target: { value: 'Day' } });
    fireEvent.change(screen.getByLabelText('Seats'), { target: { value: '35' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create class' }));

    expect(await screen.findByText('Class 8 - Day Shift')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/classes$/),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Class 8 - Day Shift', totalSeats: 35 }),
      }),
    );
  });

  it('orders classes by name and keeps applied classes last', async () => {
    const list = [
      { ...classDto, id: 'c5', name: 'Class 5 - Day Shift' },
      { ...classDto, id: 'c10', name: 'Class 10 - Science' },
      { ...classDto, id: 'c7', name: 'Class 7 - Morning Shift' },
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.endsWith('/classes')) {
          return json(list);
        }

        if (url.endsWith('/me/holds')) {
          return json([
            {
              holdId: 'h7',
              classId: 'c7',
              className: 'Class 7 - Morning Shift',
              status: 'HELD',
              expiresAt,
            },
          ]);
        }

        return json([]);
      }),
    );

    render(<App />);

    fireEvent.change(screen.getByLabelText('17-digit Birth Registration No.'), {
      target: { value: STUDENT_ID },
    });

    expect(await screen.findByText('Already applied')).toBeInTheDocument();

    const cards = screen.getAllByRole('article').map((card) => card.textContent ?? '');

    expect(cards[0]).toContain('Class 10 - Science');
    expect(cards[1]).toContain('Class 5 - Day Shift');
    expect(cards[2]).toContain('Class 7 - Morning Shift');
    expect(cards[2]).toContain('View application');
  });
});
