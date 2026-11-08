export type Role = "SUPER_ADMIN" | "ADMIN" | "TEACHER";
export interface Session {
  token: string;
  email: string;
  roles: Role[];
  expiresAt: number;
}
export interface LoginResponse {
  token: string;
  type: string;
  expiresIn: number;
  roles: string[];
}
export interface Student {
  id: number;
  name: string;
  surname: string;
  phoneNumber?: string | null;
  email?: string | null;
}
export interface User {
  id: number;
  email: string;
  roles: Role[];
}
export interface StudentInput {
  name: string;
  surname: string;
  phoneNumber: string;
  email: string;
}
export interface UserInput {
  email: string;
  password: string;
  roles: Role[];
}
