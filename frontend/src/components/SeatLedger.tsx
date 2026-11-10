interface SeatLedgerProps {
  total: number;
  confirmed: number;
  held: number;
  available: number;
}

const CELL_LIMIT = 60;
const COLUMNS = 20;

export function SeatLedger({ total, confirmed, held, available }: SeatLedgerProps) {
  const seatCount = Math.max(total, confirmed + held + available);
  const description = `${seatCount}টি আসনের মধ্যে ${confirmed}টি নিশ্চিত, ${held}টি হোল্ডে, ${available}টি খালি`;

  if (seatCount > CELL_LIMIT) {
    const width = (count: number) => `${(count / seatCount) * 100}%`;

    return (
      <div className="seat-bar" role="img" aria-label={description}>
        {confirmed > 0 && <span className="is-confirmed" style={{ width: width(confirmed) }} />}
        {held > 0 && <span className="is-held" style={{ width: width(held) }} />}
        {available > 0 && <span className="is-free" style={{ width: width(available) }} />}
      </div>
    );
  }

  const columns = Math.max(1, Math.min(COLUMNS, seatCount));

  const cells = [
    ...Array.from({ length: confirmed }, () => 'confirmed'),
    ...Array.from({ length: held }, () => 'held'),
    ...Array.from({ length: available }, () => 'free'),
  ];

  return (
    <div
      className="seat-ledger"
      role="img"
      aria-label={description}
      style={{ ['--cols' as string]: columns }}
    >
      {cells.map((state, index) => (
        <span key={index} className={`seat is-${state}`} />
      ))}
    </div>
  );
}
