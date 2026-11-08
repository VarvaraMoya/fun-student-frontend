import test from "node:test";
import assert from "node:assert/strict";
import { api, ApiError } from "../src/api.ts";
import {
  createSession,
  loadSession,
  normalizeRoles,
  permissions,
  storeSession,
} from "../src/auth.ts";
const calls: { url: string; options: RequestInit }[] = [];
let status = 200;
let result: unknown = {};
let bodyOverride: string | undefined;
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (
  input: string | URL | Request,
  options: RequestInit = {},
) => {
  calls.push({ url: String(input), options });
  return new Response(
    bodyOverride ?? (result === undefined ? null : JSON.stringify(result)),
    { status },
  );
}) as typeof fetch;
test.after(() => {
  globalThis.fetch = originalFetch;
});
test.beforeEach(() => {
  calls.length = 0;
  status = 200;
  result = {};
  bodyOverride = undefined;
});

test("login uses backend email/password contract and never sends a previous token", async () => {
  result = {
    token: "abc",
    type: "Bearer",
    expiresIn: 3600,
    roles: ["ROLE_ADMIN"],
  };
  const data = await api.login("admin@example.com", "admin");
  assert.equal(data.token, "abc");
  assert.equal(calls[0].url, "/api/v1/auth/login");
  assert.deepEqual(JSON.parse(calls[0].options.body as string), {
    email: "admin@example.com",
    password: "admin",
  });
  assert.equal(
    new Headers(calls[0].options.headers).has("Authorization"),
    false,
  );
});
test("role permissions match Spring annotations, including no implicit superadmin hierarchy", () => {
  assert.deepEqual(permissions(["TEACHER"]), {
    students: true,
    editStudents: false,
    users: false,
  });
  assert.deepEqual(permissions(["ADMIN"]), {
    students: true,
    editStudents: true,
    users: false,
  });
  assert.deepEqual(permissions(["SUPER_ADMIN"]), {
    students: false,
    editStudents: false,
    users: true,
  });
  assert.deepEqual(permissions(["SUPER_ADMIN", "ADMIN"]), {
    students: true,
    editStudents: true,
    users: true,
  });
  assert.deepEqual(permissions([]), {
    students: false,
    editStudents: false,
    users: false,
  });
  assert.deepEqual(normalizeRoles(["ROLE_ADMIN", "TEACHER", "UNKNOWN", "toString", "constructor"]), [
    "ADMIN",
    "TEACHER",
  ]);
});
test("student create uses phone_number, update uses phoneNumber and omits names", async () => {
  await api.createStudent(
    {
      name: "Анна",
      surname: "Иванова",
      email: "anna@example.com",
      phoneNumber: "+7999",
    },
    "jwt",
  );
  assert.equal(calls[0].url, "/api/v1/student/save");
  assert.deepEqual(JSON.parse(calls[0].options.body as string), {
    name: "Анна",
    surname: "Иванова",
    phone_number: "+7999",
    email: "anna@example.com",
  });
  assert.equal(
    new Headers(calls[0].options.headers).get("Authorization"),
    "Bearer jwt",
  );
  await api.updateStudent(
    42,
    { email: "new@example.com", phoneNumber: "+7888" },
    "jwt",
  );
  assert.equal(calls[1].url, "/api/v1/student/42");
  assert.equal(calls[1].options.method, "PUT");
  assert.deepEqual(JSON.parse(calls[1].options.body as string), {
    phoneNumber: "+7888",
    email: "new@example.com",
  });
});
test("student and user lists unwrap their different field names correctly", async () => {
  result = { response: [{ id: 1, name: "A", surname: "B" }], totalCount: 1 };
  assert.equal((await api.students("jwt")).response[0].id, 1);
  assert.equal(calls[0].url, "/api/v1/student");
  result = {
    responses: [{ id: 2, email: "x@example.com", roles: ["ADMIN"] }],
    totalCount: 1,
  };
  assert.equal((await api.users("jwt")).responses[0].id, 2);
  assert.equal(calls[1].url, "/api/v1/users");
});
test("role editing sends existing email and tolerates empty backend response", async () => {
  result = undefined;
  await api.updateRoles(
    { id: 5, email: "t@example.com", roles: ["TEACHER"] },
    ["ADMIN"],
    "jwt",
  );
  assert.equal(calls[0].url, "/api/v1/users/5");
  assert.deepEqual(JSON.parse(calls[0].options.body as string), {
    email: "t@example.com",
    roles: ["ADMIN"],
  });
});
test("create user sends role enum values and delete supports no-content responses", async () => {
  await api.createUser(
    { email: "t@example.com", password: "password", roles: ["TEACHER"] },
    "jwt",
  );
  assert.equal(calls[0].url, "/api/v1/users/save");
  assert.deepEqual(JSON.parse(calls[0].options.body as string), {
    email: "t@example.com",
    password: "password",
    roles: ["TEACHER"],
  });
  status = 204;
  result = undefined;
  await api.deleteUser(3, "jwt");
  await api.deleteStudent(4, "jwt");
  assert.equal(calls[1].url, "/api/v1/users/3");
  assert.equal(calls[2].url, "/api/v1/student/4");
  assert.equal(calls[2].options.method, "DELETE");
});
test("401, 403, 404 and server errors remain distinct", async () => {
  for (const code of [401, 403, 404, 500]) {
    status = code;
    await assert.rejects(
      api.students("jwt"),
      (err: unknown) => err instanceof ApiError && err.status === code,
    );
  }
});
test("unexpected HTML response fails rather than appearing as empty success", async () => {
  bodyOverride = "<html>Wrong API URL</html>";
  await assert.rejects(
    api.students("jwt"),
    (err: unknown) => err instanceof ApiError && err.status === 502,
  );
});
test("session expiry is capped by actual JWT expiry; role prefixes are normalized", () => {
  const exp = Math.floor(Date.now() / 1000) + 20;
  const token = `header.${btoa(JSON.stringify({ exp }))}.signature`;
  const session = createSession(
    { token, roles: ["ROLE_TEACHER"], type: "Bearer", expiresIn: 3600 },
    "t@example.com",
  );
  assert.equal(session.expiresAt, exp * 1000);
  assert.deepEqual(session.roles, ["TEACHER"]);
  assert.throws(() =>
    createSession(
      { token: "", roles: [], type: "Bearer", expiresIn: 3600 },
      "t@example.com",
    ),
  );
  assert.throws(() =>
    createSession(
      {
        token: `h.${btoa(JSON.stringify({ exp: 1 }))}.s`,
        roles: [],
        type: "Bearer",
        expiresIn: 3600,
      },
      "t@example.com",
    ),
  );
});
test("session persistence rejects expired, malformed and unknown-role records; logout clears it", () => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    },
  });
  assert.equal(loadSession(), null);
  const valid = {
    token: "jwt",
    email: "t@example.com",
    roles: ["TEACHER"] as const,
    expiresAt: Date.now() + 60000,
  };
  storeSession({ ...valid, roles: ["TEACHER"] });
  assert.equal(loadSession()?.token, "jwt");
  storage.set(
    "fun-student-session",
    JSON.stringify({ ...valid, expiresAt: 1 }),
  );
  assert.equal(loadSession(), null);
  storage.set("fun-student-session", "broken");
  assert.equal(loadSession(), null);
  storage.set(
    "fun-student-session",
    JSON.stringify({ ...valid, roles: ["UNKNOWN", "toString", "constructor"] }),
  );
  assert.equal(loadSession(), null);
  storeSession(null);
  assert.equal(storage.size, 0);
});
