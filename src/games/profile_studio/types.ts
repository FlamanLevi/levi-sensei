import { SchoolId } from '@/types/roster';

export interface BoundSeatInfo {
  attendanceNumber: number;
  nickname: string;
  avatar: string;
  boundAt: number;
  deviceId?: string;
}

export interface SetupRoomState {
  code: string;
  schoolId: SchoolId;
  classId: string;
  grade: string;
  classSize: number;
  hostId: string;
  createdAt: number;
  status: 'ACTIVE' | 'FINISHED';
  boundSeats?: Record<number, BoundSeatInfo>;
}
