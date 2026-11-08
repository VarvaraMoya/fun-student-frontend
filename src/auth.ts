import type { LoginResponse, Role, Session } from "./types";
const SESSION_KEY = "fun-student-session";
export const roleNames: Record<Role, string> = {
  SUPER_ADMIN: "Суперадминистратор",
  ADMIN: "Администратор",
  TEACHER: "Преподаватель",
};
export function normalizeRoles(roles: string[]): Role[] {
  return roles
    .map((role) => role.replace(/^ROLE_/, ""))
    .filter((role): role is Role => Object.hasOwn(roleNames, role));
}
export function createSession(data: LoginResponse, email: string): Session {
  if (
    !data.token ||
    !Array.isArray(data.roles) ||
    !Number.isFinite(data.expiresIn) ||
    data.expiresIn <= 0
  )
    throw new Error("Сервер вернул некорректный ответ при входе.");
  // JWT claims are read only to cap local expiry, never to grant server permissions.
  let tokenExpiry = Infinity;
  try {
    const claims = JSON.parse(
      atob(data.token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    if (typeof claims.exp === "number") tokenExpiry = claims.exp * 1000;
  } catch {
    /* server still validates every request */
  }
  const expiresAt = Math.min(Date.now() + data.expiresIn * 1000, tokenExpiry);
  if (expiresAt <= Date.now())
    throw new Error("Сервер вернул истёкший токен. Войдите повторно.");
  return {
    token: data.token,
    email,
    roles: normalizeRoles(data.roles),
    expiresAt,
  };
}
export function loadSession(): Session | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    if (
      !value ||
      typeof value.token !== "string" ||
      !value.token ||
      typeof value.email !== "string" ||
      !Number.isFinite(value.expiresAt) ||
      value.expiresAt <= Date.now() ||
      !Array.isArray(value.roles) ||
      !value.roles.every(
        (r: unknown) => typeof r === "string" && Object.hasOwn(roleNames, r),
      )
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
export function storeSession(session: Session | null) {
  if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(SESSION_KEY);
}
export const permissions = (roles: Role[]) => ({
  students: roles.includes("ADMIN") || roles.includes("TEACHER"),
  editStudents: roles.includes("ADMIN"),
  users: roles.includes("SUPER_ADMIN"),
});
