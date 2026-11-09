export type HoldStatus = 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';

export interface ClassDto {
  id: string;
  name: string;
  totalSeats: number;
  heldSeats: number;
  confirmedSeats: number;
  availableSeats: number;
}

export interface HoldDto {
  holdId: string;
  classId: string;
  studentId: string;
  status: HoldStatus;
  expiresAt: string;
}

export interface HoldSummaryDto {
  holdId: string;
  classId: string;
  className: string;
  status: HoldStatus;
  expiresAt: string;
}

export interface ConfirmDto {
  holdId: string;
  status: HoldStatus;
}
