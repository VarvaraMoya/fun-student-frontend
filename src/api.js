import { getSession } from './auth.js';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let controller = new AbortController();
export function cancelRequests() {
  controller.abort();
  controller = new AbortController();
}

// Общая функция: отправляет JSON и добавляет JWT к защищённым запросам.
export async function request(path, method = 'GET', data, protectedRequest = true) {
  const headers = { Accept: 'application/json' };
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  if (protectedRequest) {
    const session = getSession();
    if (!session || session.expiresAt <= Date.now()) throw new ApiError(401, 'Войдите в систему повторно.');
    headers.Authorization = `Bearer ${session.token}`;
  }
  let response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      headers,
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, 'Сервер недоступен. Проверьте, запущен ли бэкенд на порту 8080.');
  }
  const text = await response.text();
  let result;
  try { result = text ? JSON.parse(text) : null; } catch { result = null; }
  if (!response.ok) {
    const errors = {
      400: 'Проверьте заполнение полей.',
      401: 'Сеанс завершён. Войдите повторно.',
      403: 'Недостаточно прав для этого действия.',
      404: 'Запись не найдена. Обновите список.',
      409: 'Такая запись уже существует.',
    };
    throw new ApiError(response.status, errors[response.status] || 'Ошибка сервера. Повторите попытку.');
  }
  if (text && result === null) throw new ApiError(502, 'Сервер вернул некорректный ответ.');
  return result;
}

export const api = {
  login: (email, password) => request('/auth/login', 'POST', { email, password }, false),
  students: () => request('/student'),
  student: id => request(`/student/${id}`),
  // В DTO создания телефон называется phone_number, а в DTO обновления — phoneNumber.
  createStudent: data => request('/student/save', 'POST', {
    name: data.name, surname: data.surname, email: data.email, phone_number: data.phoneNumber,
  }),
  updateStudent: (id, data) => request(`/student/${id}`, 'PUT', {
    email: data.email, phoneNumber: data.phoneNumber,
  }),
  deleteStudent: id => request(`/student/${id}`, 'DELETE'),
  users: () => request('/users'),
  createUser: data => request('/users/save', 'POST', data),
  deleteUser: id => request(`/users/${id}`, 'DELETE'),
};
