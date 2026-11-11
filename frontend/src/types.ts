export type HoldStatus = 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';

export interface ClassInfo {
  id: string;
  name: string;
  totalSeats: number;
  heldSeats: number;
  confirmedSeats: number;
  availableSeats: number;
}

export interface Hold {
  holdId: string;
  classId: string;
  studentId?: string;
  status: HoldStatus;
  expiresAt: string;
}

export interface MyHold extends Hold {
  className: string;
}
