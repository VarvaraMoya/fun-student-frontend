// В этом файле хранятся данные текущего сеанса и проверяются роли.
const storageKey = 'student-session';
export const roleNames = {
  TEACHER: 'Преподаватель',
  ADMIN: 'Администратор',
  SUPER_ADMIN: 'Суперадминистратор',
};

let session = null;
try {
  const saved = JSON.parse(sessionStorage.getItem(storageKey));
  if (saved && typeof saved.token === 'string' && saved.token &&
      typeof saved.email === 'string' && Number.isFinite(saved.expiresAt) &&
      saved.expiresAt > Date.now() && Array.isArray(saved.roles) &&
      saved.roles.every(role => Object.hasOwn(roleNames, role))) {
    session = saved;
  }
} catch {
  // Если сохранённых данных нет или они повреждены, покажем форму входа.
}

export function getSession() {
  return session;
}

export function hasRole(role) {
  return Boolean(session?.roles.includes(role));
}

export function saveSession(response, email) {
  if (!response.token || !Array.isArray(response.roles) ||
      !Number.isFinite(response.expiresIn) || response.expiresIn <= 0) {
    throw new Error('Сервер вернул некорректные данные входа.');
  }
  let expiresAt = Date.now() + response.expiresIn * 1000;
  // Читаем срок JWT для интерфейса. Подпись и права проверяет бэкенд.
  try {
    const payload = response.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(payload));
    if (Number.isFinite(claims.exp)) expiresAt = Math.min(expiresAt, claims.exp * 1000);
  } catch { /* Окончательную проверку токена выполняет сервер. */ }
  if (expiresAt <= Date.now()) throw new Error('Срок действия токена истёк.');
  session = {
    token: response.token,
    email,
    roles: response.roles.map(role => role.replace(/^ROLE_/, ''))
      .filter(role => Object.hasOwn(roleNames, role)),
    expiresAt,
  };
  try { sessionStorage.setItem(storageKey, JSON.stringify(session)); } catch { /* Работаем до перезагрузки страницы. */ }
}

export function clearSession() {
  session = null;
  try { sessionStorage.removeItem(storageKey); } catch { /* Хранилище может быть отключено. */ }
}
