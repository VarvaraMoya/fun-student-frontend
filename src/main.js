import './style.css';
import { api, ApiError, cancelRequests } from './api.js';
import { getSession, saveSession, clearSession, hasRole, roleNames } from './auth.js';

const find = id => document.getElementById(id);
const loginForm = find('login-form');
const studentForm = find('student-form');
const userForm = find('user-form');
let selectedStudentId = null;
let sessionTimer;
let busy = false;

function showMessage(text = '', error = false) {
  const element = find('message');
  element.textContent = text;
  element.hidden = !text;
  element.className = error ? 'error-message' : 'success-message';
}

// Значения из API вставляются как текст, чтобы не выполнять HTML из данных.
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function setBusy(value) {
  busy = value;
  document.querySelectorAll('button, input, select').forEach(element => {
    if (element.id !== 'logout-button') element.disabled = value;
  });
  // При просмотре существующей записи имя и фамилия не редактируются:
  // исходный бэкенд обновляет только контакты.
  if (!value && !find('student-editor').hidden) setStudentFields();
}

// Все операции показывают понятную ошибку. При 401 закрывается кабинет.
async function run(action, login = false) {
  if (busy) return;
  const previousSession = getSession();
  setBusy(true);
  showMessage();
  try {
    await action();
  } catch (error) {
    if (error.name === 'AbortError') return;
    if (!login && getSession() !== previousSession) return;
    if (getSession() && error instanceof ApiError && error.status === 401) {
      logout('Сеанс завершён. Войдите повторно.');
    } else {
      const text = login && !getSession() && [401, 403].includes(error.status)
        ? 'Неверный email или пароль.' : error.message;
      showMessage(text || 'Не удалось выполнить действие.', true);
    }
  } finally {
    setBusy(false);
  }
}

function logout(message = '') {
  cancelRequests();
  clearTimeout(sessionTimer);
  clearSession();
  loginForm.reset();
  studentForm.reset();
  userForm.reset();
  find('students-body').replaceChildren();
  find('users-body').replaceChildren();
  find('cabinet').hidden = true;
  find('logout-button').hidden = true;
  find('login-section').hidden = false;
  find('student-editor').hidden = true;
  find('user-editor').hidden = true;
  showMessage(message, Boolean(message));
}

function openCabinet() {
  const session = getSession();
  find('login-section').hidden = true;
  find('cabinet').hidden = false;
  find('logout-button').hidden = false;
  find('account-info').textContent = `${session.email} — ${session.roles.map(role => roleNames[role]).join(', ') || 'Роль не назначена'}`;
  find('students-tab').hidden = !(hasRole('ADMIN') || hasRole('TEACHER'));
  find('users-tab').hidden = !hasRole('SUPER_ADMIN');
  find('add-student').hidden = !hasRole('ADMIN');
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(() => logout('Время сеанса истекло. Войдите повторно.'),
    Math.max(0, session.expiresAt - Date.now()));
}

function switchSection(section) {
  find('students-section').hidden = section !== 'students';
  find('users-section').hidden = section !== 'users';
  find('students-tab').classList.toggle('active', section === 'students');
  find('users-tab').classList.toggle('active', section === 'users');
  find('student-editor').hidden = true;
  find('user-editor').hidden = true;
}

async function loadStudents() {
  if (!hasRole('ADMIN') && !hasRole('TEACHER')) return;
  switchSection('students');
  const data = await api.students();
  find('students-body').innerHTML = data.response.map(student => `
    <tr>
      <td>${escapeHtml(student.id)}</td>
      <td>${escapeHtml(student.name)}</td>
      <td>${escapeHtml(student.surname)}</td>
      <td class="actions">
        <button data-open="${escapeHtml(student.id)}" class="secondary">Открыть</button>
        ${hasRole('ADMIN') ? `<button data-delete="${escapeHtml(student.id)}" class="danger">Удалить</button>` : ''}
      </td>
    </tr>`).join('');
  find('students-empty').hidden = data.response.length !== 0;
}

async function loadUsers() {
  if (!hasRole('SUPER_ADMIN')) return;
  switchSection('users');
  const data = await api.users();
  find('users-body').innerHTML = data.responses.map(user => `
    <tr>
      <td>${escapeHtml(user.id)}</td>
      <td>${escapeHtml(user.email)}</td>
      <td>${escapeHtml(user.roles.map(role => roleNames[role] || role).join(', '))}</td>
      <td>${user.email === getSession().email ? 'Это вы' : `<button data-delete="${escapeHtml(user.id)}" class="danger">Удалить</button>`}</td>
    </tr>`).join('');
  find('users-empty').hidden = data.responses.length !== 0;
}

function setStudentFields() {
  const readOnly = !hasRole('ADMIN');
  for (const name of ['name', 'surname', 'email', 'phoneNumber']) {
    studentForm.elements[name].disabled = readOnly ||
      (selectedStudentId !== null && ['name', 'surname'].includes(name));
  }
  find('save-student').hidden = readOnly;
}

function openStudentForm(student = null) {
  selectedStudentId = student?.id ?? null;
  studentForm.reset();
  for (const name of ['name', 'surname', 'email', 'phoneNumber']) {
    studentForm.elements[name].value = student?.[name] || '';
  }
  find('student-form-title').textContent = student ? 'Данные студента' : 'Новый студент';
  find('student-editor').hidden = false;
  setStudentFields();
}

loginForm.addEventListener('submit', event => {
  event.preventDefault();
  run(async () => {
    const email = loginForm.elements.email.value.trim();
    const response = await api.login(email, loginForm.elements.password.value);
    saveSession(response, email);
    loginForm.reset();
    openCabinet();
    if (hasRole('ADMIN') || hasRole('TEACHER')) await loadStudents();
    else if (hasRole('SUPER_ADMIN')) await loadUsers();
    else showMessage('Для этой учётной записи нет доступных разделов.', true);
  }, true);
});

find('logout-button').addEventListener('click', () => logout());
find('students-tab').addEventListener('click', () => run(loadStudents));
find('users-tab').addEventListener('click', () => run(loadUsers));
find('refresh-students').addEventListener('click', () => run(loadStudents));
find('refresh-users').addEventListener('click', () => run(loadUsers));
find('add-student').addEventListener('click', () => { showMessage(); openStudentForm(); });
find('cancel-student').addEventListener('click', () => { find('student-editor').hidden = true; });

find('students-body').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.open) run(async () => openStudentForm(await api.student(Number(button.dataset.open))));
  if (button.dataset.delete && hasRole('ADMIN') && confirm('Удалить этого студента?')) {
    run(async () => {
      await api.deleteStudent(Number(button.dataset.delete));
      await loadStudents();
      showMessage('Студент удалён.');
    });
  }
});

studentForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!hasRole('ADMIN')) return;
  run(async () => {
    const data = {};
    for (const name of ['name', 'surname', 'email', 'phoneNumber']) {
      data[name] = studentForm.elements[name].value.trim();
    }
    if (selectedStudentId === null) await api.createStudent(data);
    else await api.updateStudent(selectedStudentId, data);
    await loadStudents();
    showMessage('Данные сохранены.');
  });
});

find('add-user').addEventListener('click', () => {
  showMessage();
  userForm.reset();
  find('user-editor').hidden = false;
});
find('cancel-user').addEventListener('click', () => { find('user-editor').hidden = true; });
userForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!hasRole('SUPER_ADMIN')) return;
  run(async () => {
    await api.createUser({
      email: userForm.elements.email.value.trim(),
      password: userForm.elements.password.value,
      roles: [userForm.elements.role.value],
    });
    userForm.reset();
    await loadUsers();
    showMessage('Пользователь создан.');
  });
});
find('users-body').addEventListener('click', event => {
  const button = event.target.closest('button[data-delete]');
  if (!button || !hasRole('SUPER_ADMIN') || !confirm('Удалить этого пользователя?')) return;
  run(async () => {
    await api.deleteUser(Number(button.dataset.delete));
    await loadUsers();
    showMessage('Пользователь удалён.');
  });
});

window.addEventListener('focus', () => {
  const session = getSession();
  if (session && session.expiresAt <= Date.now()) logout('Время сеанса истекло. Войдите повторно.');
});

// После обновления страницы восстанавливаем действующий сеанс.
if (getSession()) {
  openCabinet();
  if (hasRole('ADMIN') || hasRole('TEACHER')) run(loadStudents);
  else if (hasRole('SUPER_ADMIN')) run(loadUsers);
  else showMessage('Для этой учётной записи нет доступных разделов.', true);
}
