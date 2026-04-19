export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export interface User {
  id: string;
  login: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
