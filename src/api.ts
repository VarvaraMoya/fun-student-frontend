import type {
  LoginResponse,
  Student,
  StudentInput,
  User,
  UserInput,
} from "./types";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(
      `${(import.meta.env?.VITE_API_URL || "").replace(/\/$/, "")}/api/v1${path}`,
      {
        ...options,
        headers,
        signal: options.signal || AbortSignal.timeout(15000),
        cache: "no-store",
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiError(
      0,
      "Не удалось связаться с сервером. Проверьте, запущен ли бэкенд и доступно ли подключение.",
    );
  }
  const raw = await response.text();
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : undefined;
  } catch {
    data = undefined;
  }
  if (!response.ok) {
    const detail =
      typeof data === "object" &&
      data &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message.slice(0, 250)
        : "";
    const messages: Record<number, string> = {
      400: detail || "Проверьте заполненные поля.",
      401: "Сеанс истёк. Войдите снова.",
      403: "Недостаточно прав для выполнения действия.",
      404: "Запись не найдена. Обновите список.",
      409: detail || "Такая запись уже существует.",
    };
    throw new ApiError(
      response.status,
      messages[response.status] || "Ошибка сервера. Повторите попытку позже.",
    );
  }
  if (raw && data === undefined)
    throw new ApiError(
      502,
      "Сервер вернул неожиданный ответ. Проверьте адрес API.",
    );
  return data as T;
}
export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  students: (token: string, signal?: AbortSignal) =>
    request<{ response: Student[]; totalCount: number }>(
      "/student",
      { signal },
      token,
    ),
  student: (id: number, token: string, signal?: AbortSignal) =>
    request<Student>(`/student/${id}`, { signal }, token),
  createStudent: (data: StudentInput, token: string) =>
    request<Student>(
      "/student/save",
      {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          surname: data.surname,
          phone_number: data.phoneNumber,
          email: data.email,
        }),
      },
      token,
    ),
  updateStudent: (
    id: number,
    data: Pick<StudentInput, "email" | "phoneNumber">,
    token: string,
  ) =>
    request<Student>(
      `/student/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          phoneNumber: data.phoneNumber,
          email: data.email,
        }),
      },
      token,
    ),
  deleteStudent: (id: number, token: string) =>
    request<void>(`/student/${id}`, { method: "DELETE" }, token),
  users: (token: string, signal?: AbortSignal) =>
    request<{ responses: User[]; totalCount: number }>(
      "/users",
      { signal },
      token,
    ),
  createUser: (data: UserInput, token: string) =>
    request<User>(
      "/users/save",
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),
  // In the supplied backend updateUser finds the account by email, ignores password and returns an empty body.
  updateRoles: (user: User, roles: UserInput["roles"], token: string) =>
    request<void>(
      `/users/${user.id}`,
      { method: "PUT", body: JSON.stringify({ email: user.email, roles }) },
      token,
    ),
  deleteUser: (id: number, token: string) =>
    request<void>(`/users/${id}`, { method: "DELETE" }, token),
};
