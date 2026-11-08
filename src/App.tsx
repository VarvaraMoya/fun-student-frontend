import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Eye,
  EyeOff,
  GraduationCap,
  LayoutList,
  LoaderCircle,
  LogOut,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { api, ApiError } from "./api";
import {
  createSession,
  loadSession,
  permissions,
  roleNames,
  storeSession,
} from "./auth";
import type { Role, Session, Student, StudentInput, User } from "./types";

const roleList: Role[] = ["TEACHER", "ADMIN", "SUPER_ADMIN"];
const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : "Не удалось выполнить действие.";
const initials = (name: string) =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
function Spinner() {
  return <LoaderCircle className="spin" size={18} aria-hidden="true" />;
}
function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice" role="alert">
      {children}
    </div>
  );
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <GraduationCap size={24} />
      </span>
      <div>
        Студенты<span>УЧЕБНЫЙ КАБИНЕТ</span>
      </div>
    </div>
  );
}
function Password({
  value,
  onChange,
  autoComplete = "current-password",
  required = true,
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  const id = useId();
  return (
    <label htmlFor={id}>
      Пароль
      <div className="password">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          maxLength={128}
          placeholder="Введите пароль"
        />
        <button
          type="button"
          aria-label={show ? "Скрыть пароль" : "Показать пароль"}
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}
function Modal({
  title,
  description,
  children,
  close,
  busy = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  close: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const before = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      before?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) close();
      }}
    >
      <div className="modal-head">
        <div>
          <h2 id={id}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <button
          className="icon-button"
          onClick={close}
          disabled={busy}
          aria-label="Закрыть"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Login({
  onLogin,
  initialMessage,
}: {
  onLogin: (session: Session) => void;
  initialMessage: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialMessage);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await api.login(email.trim(), password);
      onLogin(createSession(response, email.trim()));
    } catch (err) {
      setError(
        err instanceof ApiError && [401, 403].includes(err.status)
          ? "Неверный email или пароль. Проверьте данные и попробуйте снова."
          : messageOf(err),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <Brand />
        <div className="story-copy">
          <div className="eyebrow">ПОРЯДОК В УЧЕБНЫХ ДАННЫХ</div>
          <h1>
            Все студенты.
            <br />
            Один кабинет.
          </h1>
          <p>
            Контакты, учётные записи и доступы —<br />в простом и удобном
            пространстве.
          </p>
          <div className="illustration" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="illus-card">
              <div className="illus-icon">
                <Users size={32} />
              </div>
              <span>Список студентов</span>
              <div className="illus-row">
                <i>МИ</i>
                <b />
                <Check size={16} />
              </div>
              <div className="illus-row">
                <i>ПС</i>
                <b />
                <Check size={16} />
              </div>
              <div className="illus-row">
                <i>ЕС</i>
                <b />
                <Check size={16} />
              </div>
            </div>
            <div className="illus-badge">
              <ShieldCheck size={20} /> Доступ по ролям
            </div>
          </div>
        </div>
        <div className="story-bottom">
          <BookOpen size={17} /> Проект по современным технологиям
          программирования
        </div>
      </section>
      <section className="login-main">
        <div className="login-mobile-brand">
          <Brand />
        </div>
        <div className="login-form">
          <span className="section-tag">
            <ShieldCheck size={16} /> Защищённый вход
          </span>
          <h2>Рады видеть вас</h2>
          <p className="muted">Войдите в свой учебный кабинет.</p>
          <form onSubmit={submit}>
            <fieldset disabled={busy}>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                  maxLength={254}
                  placeholder="name@example.com"
                  autoFocus
                />
              </label>
              <Password value={password} onChange={setPassword} />
              {error && <Notice>{error}</Notice>}
              <button className="button primary full" type="submit">
                {busy ? (
                  <>
                    <Spinner /> Входим…
                  </>
                ) : (
                  <>
                    Войти в кабинет <ArrowRight size={18} />
                  </>
                )}
              </button>
            </fieldset>
          </form>
          <div className="login-help">
            <CircleHelp size={18} />
            <p>
              Нет учётной записи?
              <br />
              <span>Обратитесь к суперадминистратору системы.</span>
            </p>
          </div>
        </div>
        <footer>Студенты · Учебная информационная система</footer>
      </section>
    </div>
  );
}
function StudentEditor({
  student,
  token,
  close,
  done,
  fail,
}: {
  student: Student | null;
  token: string;
  close: () => void;
  done: (text: string) => void;
  fail: (e: unknown) => void;
}) {
  const [data, setData] = useState<StudentInput>({
    name: student?.name || "",
    surname: student?.surname || "",
    email: student?.email || "",
    phoneNumber: student?.phoneNumber || "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (key: keyof StudentInput, value: string) =>
    setData((old) => ({ ...old, [key]: value }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const clean = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v.trim()]),
      ) as unknown as StudentInput;
      if (student) await api.updateStudent(student.id, clean, token);
      else await api.createStudent(clean, token);
      done(student ? "Контакты студента обновлены" : "Студент добавлен");
    } catch (err) {
      setError(messageOf(err));
      fail(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={student ? "Изменить контакты" : "Новый студент"}
      description={
        student
          ? "Можно изменить email и номер телефона."
          : "Добавьте основную информацию о студенте."
      }
      close={close}
      busy={busy}
    >
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <div className="form-grid">
            <label>
              Имя
              <input
                value={data.name}
                onChange={(e) => update("name", e.target.value)}
                required
                pattern=".*\S.*"
                maxLength={100}
                disabled={!!student}
              />
            </label>
            <label>
              Фамилия
              <input
                value={data.surname}
                onChange={(e) => update("surname", e.target.value)}
                required
                pattern=".*\S.*"
                maxLength={100}
                disabled={!!student}
              />
            </label>
          </div>
          <label>
            Email
            <input
              type="email"
              value={data.email}
              onChange={(e) => update("email", e.target.value)}
              maxLength={254}
              placeholder="student@example.com"
            />
          </label>
          <label>
            Телефон
            <input
              type="tel"
              value={data.phoneNumber}
              onChange={(e) => update("phoneNumber", e.target.value)}
              maxLength={30}
              placeholder="+7 (999) 123-45-67"
            />
          </label>
          {error && <Notice>{error}</Notice>}
          <div className="modal-actions">
            <button type="button" className="button secondary" onClick={close}>
              Отмена
            </button>
            <button className="button primary" type="submit">
              {busy && <Spinner />}Сохранить
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
function UserEditor({
  user,
  token,
  close,
  done,
  fail,
}: {
  user: User | null;
  token: string;
  close: () => void;
  done: (text: string) => void;
  fail: (e: unknown) => void;
}) {
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<Role[]>(user?.roles || ["TEACHER"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!roles.length) {
      setError("Выберите хотя бы одну роль.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (user) await api.updateRoles(user, roles, token);
      else
        await api.createUser({ email: email.trim(), password, roles }, token);
      done(user ? "Роли пользователя обновлены" : "Учётная запись создана");
    } catch (err) {
      setError(messageOf(err));
      fail(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={user ? "Изменить роли" : "Новый пользователь"}
      description={
        user
          ? "Новые права применяются сервером сразу. Пользователю нужно войти повторно для обновления интерфейса."
          : "Создайте учётную запись и назначьте доступ."
      }
      close={close}
      busy={busy}
    >
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
              maxLength={254}
              disabled={!!user}
            />
          </label>
          {!user && (
            <Password
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />
          )}
          <div className="field-label">Роли пользователя</div>
          <div className="role-options">
            {roleList.map((role) => (
              <label key={role}>
                <input
                  type="checkbox"
                  checked={roles.includes(role)}
                  onChange={(e) =>
                    setRoles((old) =>
                      e.target.checked
                        ? [...old, role]
                        : old.filter((r) => r !== role),
                    )
                  }
                />
                <div>
                  <strong>{roleNames[role]}</strong>
                  <span>
                    {role === "TEACHER"
                      ? "Просмотр списка и контактов студентов"
                      : role === "ADMIN"
                        ? "Добавление, изменение и удаление студентов"
                        : "Создание пользователей и управление ролями"}
                  </span>
                </div>
              </label>
            ))}
          </div>
          {error && <Notice>{error}</Notice>}
          <div className="modal-actions">
            <button type="button" className="button secondary" onClick={close}>
              Отмена
            </button>
            <button className="button primary" type="submit">
              {busy && <Spinner />}Сохранить
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
function StudentDetails({
  id,
  token,
  close,
  edit,
  fail,
}: {
  id: number;
  token: string;
  close: () => void;
  edit?: (student: Student) => void;
  fail: (err: unknown) => void;
}) {
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setStudent(null);
    api
      .student(id, token, controller.signal)
      .then(setStudent)
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(messageOf(err));
          fail(err);
        }
      });
    return () => controller.abort();
  }, [id, token, fail, retry]);
  return (
    <Modal title="Карточка студента" close={close}>
      {error ? (
        <>
          <Notice>{error}</Notice>
          <button
            className="button secondary"
            onClick={() => setRetry((n) => n + 1)}
          >
            Повторить
          </button>
        </>
      ) : !student ? (
        <div className="loading">
          <Spinner /> Загружаем контакты…
        </div>
      ) : (
        <>
          <div className="detail-profile">
            <span className="avatar large">
              {initials(`${student.name} ${student.surname}`)}
            </span>
            <h3>
              {student.surname} {student.name}
            </h3>
            <span className="muted">Студент · ID {student.id}</span>
          </div>
          <dl className="contact-list">
            <div>
              <dt>
                <Mail size={17} /> Email
              </dt>
              <dd>{student.email || "Не указан"}</dd>
            </div>
            <div>
              <dt>
                <Phone size={17} /> Телефон
              </dt>
              <dd>{student.phoneNumber || "Не указан"}</dd>
            </div>
          </dl>
          {edit && (
            <div className="modal-actions">
              <button className="button primary" onClick={() => edit(student)}>
                <Pencil size={16} /> Изменить контакты
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
type DeleteTarget = { kind: "student" | "user"; id: number; name: string };
function DeleteDialog({
  target,
  token,
  close,
  done,
  fail,
}: {
  target: DeleteTarget;
  token: string;
  close: () => void;
  done: (text: string) => void;
  fail: (err: unknown) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    setBusy(true);
    setError("");
    try {
      if (target.kind === "student") await api.deleteStudent(target.id, token);
      else await api.deleteUser(target.id, token);
      done("Запись удалена");
    } catch (err) {
      setError(messageOf(err));
      fail(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        target.kind === "student"
          ? "Удалить студента?"
          : "Удалить пользователя?"
      }
      close={close}
      busy={busy}
    >
      <p className="delete-copy">
        Запись «{target.name}» будет удалена. Отменить это действие нельзя.
      </p>
      {error && <Notice>{error}</Notice>}
      <div className="modal-actions">
        <button className="button secondary" disabled={busy} onClick={close}>
          Отмена
        </button>
        <button className="button danger" disabled={busy} onClick={remove}>
          {busy && <Spinner />}Удалить
        </button>
      </div>
    </Modal>
  );
}
function Workspace({
  session,
  logout,
}: {
  session: Session;
  logout: (message?: string) => void;
}) {
  const access = permissions(session.roles);
  const [page, setPage] = useState<"students" | "users" | "help">(
    access.students ? "students" : access.users ? "users" : "help",
  );
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [studentEditor, setStudentEditor] = useState<
    Student | null | undefined
  >();
  const [userEditor, setUserEditor] = useState<User | null | undefined>();
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deletion, setDeletion] = useState<DeleteTarget | null>(null);
  const [toast, setToast] = useState("");
  const fail = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401)
        logout("Сеанс завершён. Войдите в кабинет повторно.");
    },
    [logout],
  );
  useEffect(() => {
    const check = () => {
      if (Date.now() >= session.expiresAt)
        logout("Время сеанса истекло. Войдите повторно.");
    };
    const timer = setTimeout(
      check,
      Math.max(0, session.expiresAt - Date.now()),
    );
    window.addEventListener("focus", check);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", check);
    };
  }, [session, logout]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setLoading(true);
    const result =
      page === "students" && access.students
        ? api
            .students(session.token, controller.signal)
            .then((data) => setStudents(data.response))
        : page === "users" && access.users
          ? api
              .users(session.token, controller.signal)
              .then((data) => setUsers(data.responses))
          : Promise.resolve();
    result
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(messageOf(err));
          fail(err);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, reload, session.token, access.students, access.users, fail]);
  function navigate(next: typeof page) {
    setPage(next);
    setQuery("");
    setRoleFilter("");
    setCurrentPage(1);
  }
  function done(text: string) {
    setStudentEditor(undefined);
    setUserEditor(undefined);
    setDeletion(null);
    setToast(text);
    setReload((n) => n + 1);
  }
  const isStudents = page === "students";
  const title = isStudents
    ? "Студенты"
    : page === "users"
      ? "Пользователи"
      : "Мой доступ";
  const filtered = (isStudents ? students : users).filter((item) => {
    const text =
      "surname" in item
        ? `${item.surname} ${item.name} ${item.id}`
        : `${item.email} ${item.id}`;
    return (
      text
        .toLocaleLowerCase("ru")
        .includes(query.trim().toLocaleLowerCase("ru")) &&
      (!roleFilter ||
        ("roles" in item && item.roles.includes(roleFilter as Role)))
    );
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / 8));
  const safePage = Math.min(currentPage, pageCount);
  const visible = filtered.slice((safePage - 1) * 8, safePage * 8);
  const count = isStudents ? students.length : users.length;
  const canCreate = isStudents ? access.editStudents : access.users;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        К основному содержимому
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="nav-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
        <nav aria-label="Основная навигация">
          {access.students && (
            <button
              className={isStudents ? "nav-item active" : "nav-item"}
              onClick={() => navigate("students")}
            >
              <GraduationCap size={20} /> Студенты <ChevronRight size={16} />
            </button>
          )}
          {access.users && (
            <button
              className={page === "users" ? "nav-item active" : "nav-item"}
              onClick={() => navigate("users")}
            >
              <Users size={20} /> Пользователи <ChevronRight size={16} />
            </button>
          )}
          <button
            className={page === "help" ? "nav-item active" : "nav-item"}
            onClick={() => navigate("help")}
          >
            <ShieldCheck size={20} /> Мой доступ <ChevronRight size={16} />
          </button>
        </nav>
        <div className="sidebar-note">
          <BookOpen size={22} />
          <strong>Учебный проект</strong>
          <p>Управление данными студентов и учётными записями.</p>
        </div>
        <div className="sidebar-profile">
          <span className="avatar">{initials(session.email)}</span>
          <div>
            <strong title={session.email}>{session.email.split("@")[0]}</strong>
            <span>
              {session.roles.map((r) => roleNames[r]).join(", ") || "Без роли"}
            </span>
          </div>
          <button
            className="icon-button"
            onClick={() => logout()}
            aria-label="Выйти"
            title="Выйти"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            Учебный кабинет <ChevronRight size={14} /> <strong>{title}</strong>
          </span>
          <div>
            <span className="access-pill">
              <ShieldCheck size={14} /> Доступ по ролям
            </span>
            <button
              className="mobile-exit icon-button"
              aria-label="Выйти"
              onClick={() => logout()}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">УЧЕБНЫЙ КАБИНЕТ</div>
              <h1>
                {title}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {isStudents
                  ? "Список студентов и их контактная информация."
                  : page === "users"
                    ? "Учётные записи и права доступа к системе."
                    : "Ваша учётная запись и доступные действия."}
              </p>
            </div>
            {page !== "help" && canCreate && (
              <button
                className="button primary"
                onClick={() =>
                  isStudents ? setStudentEditor(null) : setUserEditor(null)
                }
              >
                <Plus size={18} />
                {isStudents ? "Добавить студента" : "Добавить пользователя"}
              </button>
            )}
          </div>
          {page === "help" ? (
            <>
              <section className="profile-card">
                <div className="profile-symbol">
                  <ShieldCheck size={30} />
                </div>
                <div>
                  <h2>{session.email}</h2>
                  <div className="badges">
                    {session.roles.map((r) => (
                      <span key={r} className={`badge ${r.toLowerCase()}`}>
                        {roleNames[r]}
                      </span>
                    ))}
                  </div>
                  <p className="muted">
                    Сеанс действует до{" "}
                    {new Date(session.expiresAt).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    .
                  </p>
                </div>
              </section>
              <section className="panel help-panel">
                <h2>Что вам доступно</h2>
                <div className="permission-row">
                  <span>Список и карточки студентов</span>
                  <span className={access.students ? "allowed" : "muted"}>
                    {access.students ? "Доступно" : "Нет доступа"}
                  </span>
                </div>
                <div className="permission-row">
                  <span>Добавление, редактирование и удаление студентов</span>
                  <span className={access.editStudents ? "allowed" : "muted"}>
                    {access.editStudents ? "Доступно" : "Нет доступа"}
                  </span>
                </div>
                <div className="permission-row">
                  <span>Управление пользователями и ролями</span>
                  <span className={access.users ? "allowed" : "muted"}>
                    {access.users ? "Доступно" : "Нет доступа"}
                  </span>
                </div>
                <p className="help-foot">
                  Права назначает суперадминистратор. Для обновления прав после
                  изменения роли войдите в систему повторно.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="summary-strip">
                <div className="summary-main">
                  <span className="summary-icon">
                    {isStudents ? (
                      <GraduationCap size={25} />
                    ) : (
                      <Users size={25} />
                    )}
                  </span>
                  <div>
                    <span>
                      {isStudents ? "Всего студентов" : "Всего пользователей"}
                    </span>
                    <strong>
                      {loading || error ? "—" : count}
                      <small>в системе</small>
                    </strong>
                  </div>
                </div>
                <div className="summary-access">
                  <ShieldCheck size={20} />
                  <div>
                    <strong>
                      {isStudents
                        ? access.editStudents
                          ? "Управление студентами"
                          : "Режим просмотра"
                        : "Управление доступом"}
                    </strong>
                    <span>
                      {isStudents
                        ? access.editStudents
                          ? "Вы можете добавлять и изменять записи"
                          : "Вам доступны список и карточки студентов"
                        : "Вы можете создавать аккаунты и назначать роли"}
                    </span>
                  </div>
                </div>
              </section>
              <section className="panel">
                <div className="panel-title">
                  <div>
                    <h2>
                      {isStudents ? "Список студентов" : "Учётные записи"}
                    </h2>
                    <span>
                      {loading
                        ? "Загрузка данных"
                        : error
                          ? "Данные недоступны"
                          : `${count} записей`}
                    </span>
                  </div>
                  <button
                    className="button secondary compact"
                    onClick={() => setReload((n) => n + 1)}
                    disabled={loading}
                  >
                    <RefreshCw size={16} className={loading ? "spin" : ""} />{" "}
                    Обновить
                  </button>
                </div>
                <div className="toolbar">
                  <div className="search-field">
                    <Search size={18} />
                    <input
                      aria-label={
                        isStudents ? "Поиск студентов" : "Поиск пользователей"
                      }
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder={
                        isStudents
                          ? "Найти по имени, фамилии или ID…"
                          : "Найти по email или ID…"
                      }
                    />
                    {query && (
                      <button
                        className="icon-button"
                        onClick={() => setQuery("")}
                        aria-label="Очистить поиск"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {!isStudents && (
                    <select
                      aria-label="Фильтр по роли"
                      value={roleFilter}
                      onChange={(e) => {
                        setRoleFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="">Все роли</option>
                      {roleList.map((r) => (
                        <option key={r} value={r}>
                          {roleNames[r]}
                        </option>
                      ))}
                    </select>
                  )}
                  <span className="list-view">
                    <LayoutList size={17} /> Список
                  </span>
                </div>
                {loading ? (
                  <div className="empty">
                    <Spinner />
                    <h3>Загружаем данные</h3>
                    <p>Это займёт несколько секунд.</p>
                  </div>
                ) : error ? (
                  <div className="empty error-state">
                    <CircleHelp size={28} />
                    <h3>Не удалось загрузить данные</h3>
                    <p role="alert">{error}</p>
                    <button
                      className="button secondary"
                      onClick={() => setReload((n) => n + 1)}
                    >
                      Повторить попытку
                    </button>
                  </div>
                ) : !visible.length ? (
                  <div className="empty">
                    <Search size={28} />
                    <h3>
                      {query || roleFilter
                        ? "Ничего не найдено"
                        : "Пока нет записей"}
                    </h3>
                    <p>
                      {query || roleFilter
                        ? "Попробуйте изменить запрос или сбросить фильтры."
                        : "Добавьте первую запись, чтобы начать работу."}
                    </p>
                    {(query || roleFilter) && (
                      <button
                        className="button secondary"
                        onClick={() => {
                          setQuery("");
                          setRoleFilter("");
                        }}
                      >
                        Сбросить фильтры
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th className="id-col">ID</th>
                          <th>{isStudents ? "Студент" : "Пользователь"}</th>
                          <th>{isStudents ? "Тип записи" : "Роли"}</th>
                          <th className="actions-col">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((item, index) => {
                          const student = "surname" in item ? item : null;
                          const user = "roles" in item ? item : null;
                          const name = student
                            ? `${student.surname} ${student.name}`
                            : user!.email;
                          const self = user?.email === session.email;
                          return (
                            <tr key={item.id}>
                              <td className="muted">
                                {String(item.id).padStart(2, "0")}
                              </td>
                              <td>
                                <div className="person-cell">
                                  <span className={`avatar tone-${index % 4}`}>
                                    {initials(name)}
                                  </span>
                                  <div>
                                    {student ? (
                                      <button
                                        className="name-button"
                                        onClick={() => setDetailId(item.id)}
                                      >
                                        {name}
                                      </button>
                                    ) : (
                                      <strong>{name}</strong>
                                    )}
                                    <span>
                                      {student
                                        ? "Контакты в карточке студента"
                                        : self
                                          ? "Ваша учётная запись"
                                          : `Учётная запись № ${item.id}`}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="badges">
                                  {student ? (
                                    <span className="badge student">
                                      Студент
                                    </span>
                                  ) : (
                                    user!.roles.map((r) => (
                                      <span
                                        key={r}
                                        className={`badge ${r.toLowerCase()}`}
                                      >
                                        {roleNames[r] || r}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className="row-actions">
                                  {student && (
                                    <button
                                      className="icon-button"
                                      aria-label={`Открыть: ${name}`}
                                      title="Карточка студента"
                                      onClick={() => setDetailId(item.id)}
                                    >
                                      <Eye size={17} />
                                    </button>
                                  )}
                                  {((student && access.editStudents) ||
                                    (user && !self)) && (
                                    <button
                                      className="icon-button"
                                      aria-label={`Изменить: ${name}`}
                                      title={
                                        student
                                          ? "Изменить контакты"
                                          : "Изменить роли"
                                      }
                                      onClick={() =>
                                        student
                                          ? setDetailId(item.id)
                                          : setUserEditor(user)
                                      }
                                    >
                                      <Pencil size={16} />
                                    </button>
                                  )}
                                  {((student && access.editStudents) ||
                                    (user && !self)) && (
                                    <button
                                      className="icon-button delete-button"
                                      aria-label={`Удалить: ${name}`}
                                      title="Удалить"
                                      onClick={() =>
                                        setDeletion({
                                          kind: student ? "student" : "user",
                                          id: item.id,
                                          name,
                                        })
                                      }
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                  {self && (
                                    <span className="muted self-label">
                                      Это вы
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="pagination">
                  <span>
                    {loading || error
                      ? "—"
                      : filtered.length
                        ? `Показано ${(safePage - 1) * 8 + 1}–${Math.min(safePage * 8, filtered.length)} из ${filtered.length}`
                        : "0 записей"}
                  </span>
                  <div>
                    <button
                      className="icon-button"
                      aria-label="Предыдущая страница"
                      disabled={loading || !!error || safePage <= 1}
                      onClick={() => setCurrentPage(safePage - 1)}
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <span className="page-number">{safePage}</span>
                    <button
                      className="icon-button"
                      aria-label="Следующая страница"
                      disabled={loading || !!error || safePage >= pageCount}
                      onClick={() => setCurrentPage(safePage + 1)}
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              </section>
              <div className="page-foot">
                <ShieldCheck size={15} /> Данные доступны только авторизованным
                пользователям.
              </div>
            </>
          )}
        </main>
        <footer className="app-footer">
          Студенты · Учебный проект{" "}
          <span>Современные технологии программирования</span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button
            className="icon-button"
            aria-label="Закрыть уведомление"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {studentEditor !== undefined && (
        <StudentEditor
          student={studentEditor}
          token={session.token}
          close={() => setStudentEditor(undefined)}
          done={done}
          fail={fail}
        />
      )}{" "}
      {userEditor !== undefined && (
        <UserEditor
          user={userEditor}
          token={session.token}
          close={() => setUserEditor(undefined)}
          done={done}
          fail={fail}
        />
      )}{" "}
      {detailId !== null && (
        <StudentDetails
          id={detailId}
          token={session.token}
          close={() => setDetailId(null)}
          fail={fail}
          edit={
            access.editStudents
              ? (student) => {
                  setDetailId(null);
                  setStudentEditor(student);
                }
              : undefined
          }
        />
      )}{" "}
      {deletion && (
        <DeleteDialog
          target={deletion}
          token={session.token}
          close={() => setDeletion(null)}
          done={done}
          fail={fail}
        />
      )}
    </div>
  );
}
export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession);
  const [message, setMessage] = useState("");
  const logout = useCallback((reason = "") => {
    try {
      storeSession(null);
    } catch {
      /* Storage may be blocked by the browser. */
    }
    setSession(null);
    setMessage(reason);
  }, []);
  function login(value: Session) {
    try {
      storeSession(value);
    } catch {
      /* In-memory session still works if browser blocks storage. */
    }
    setMessage("");
    setSession(value);
  }
  return session ? (
    <Workspace key={session.token} session={session} logout={logout} />
  ) : (
    <Login onLogin={login} initialMessage={message} />
  );
}
