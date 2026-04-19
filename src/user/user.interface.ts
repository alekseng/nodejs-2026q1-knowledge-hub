export enum UserRole {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export interface User {
  id: string;
  login: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
