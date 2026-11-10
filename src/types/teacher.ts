export type TeacherRoleTitle = 'ALT' | 'JTE' | 'HRT' | 'GUEST';

export interface TeacherProfile {
  id: string;
  name: string;
  jaName: string;
  title: TeacherRoleTitle;
  avatar: string;
  custom?: boolean;
}

export const DEFAULT_TEACHER_PROFILES: TeacherProfile[] = [
  {
    id: 'levi_sensei',
    name: 'Levi-Sensei',
    jaName: 'リヴァイ先生 🇨🇦',
    title: 'ALT',
    avatar: '👨‍🏫'
  },
  {
    id: 'jte',
    name: 'JTE Sensei',
    jaName: 'JTE・外国語専科',
    title: 'JTE',
    avatar: '👩‍🏫'
  },
  {
    id: 'homeroom',
    name: 'HR Teacher',
    jaName: '担任の先生',
    title: 'HRT',
    avatar: '🧑‍🏫'
  }
];
