import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type UserStatus = "active" | "frozen";

export type UserProfile = {
  email: string;
  password: string;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string;
  loginRecords: string[];
};

type UserStoreGlobal = typeof globalThis & {
  __aiEmployeeUsers?: UserProfile[];
};

const globalStore = globalThis as UserStoreGlobal;
const projectDataDir = path.join(process.cwd(), "data");
const tmpDataDir = path.join(os.tmpdir(), "ai-employee-platform");
const projectUsersFile = path.join(projectDataDir, "users.json");
const tmpUsersFile = path.join(tmpDataDir, "users.json");

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeUser(value: Partial<UserProfile>): UserProfile | null {
  if (!value.email || typeof value.email !== "string") return null;

  const now = new Date().toISOString();

  return {
    email: normalizeEmail(value.email),
    password: typeof value.password === "string" ? value.password : "",
    status: value.status === "frozen" ? "frozen" : "active",
    createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
    lastLoginAt: typeof value.lastLoginAt === "string" ? value.lastLoginAt : "",
    loginRecords: Array.isArray(value.loginRecords)
      ? value.loginRecords.filter((record): record is string => typeof record === "string")
      : [],
  };
}

async function readUsersFile(filePath: string) {
  const raw = await readFile(filePath, "utf8");
  const users = JSON.parse(raw) as Partial<UserProfile>[];

  return Array.isArray(users)
    ? users.map(normalizeUser).filter((user): user is UserProfile => Boolean(user))
    : [];
}

async function writeUsersFile(filePath: string, users: UserProfile[]) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(users, null, 2), "utf8");
}

export async function readUsers(): Promise<UserProfile[]> {
  if (globalStore.__aiEmployeeUsers) return globalStore.__aiEmployeeUsers;

  try {
    const users = await readUsersFile(projectUsersFile);
    globalStore.__aiEmployeeUsers = users;

    return users;
  } catch {
    try {
      const users = await readUsersFile(tmpUsersFile);
      globalStore.__aiEmployeeUsers = users;

      return users;
    } catch {
      globalStore.__aiEmployeeUsers = [];

      return [];
    }
  }
}

export async function writeUsers(users: UserProfile[]) {
  globalStore.__aiEmployeeUsers = users
    .map((user) => normalizeUser(user))
    .filter((user): user is UserProfile => Boolean(user));

  await Promise.any([
    writeUsersFile(projectUsersFile, globalStore.__aiEmployeeUsers),
    writeUsersFile(tmpUsersFile, globalStore.__aiEmployeeUsers),
  ]).catch(() => undefined);

  return globalStore.__aiEmployeeUsers;
}

export async function registerUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const users = await readUsers();
  const existingUser = users.find((user) => user.email === normalizedEmail);

  if (existingUser) return { user: existingUser, created: false };

  const now = new Date().toISOString();
  const user: UserProfile = {
    email: normalizedEmail,
    password,
    status: "active",
    createdAt: now,
    lastLoginAt: now,
    loginRecords: [now],
  };

  await writeUsers([user, ...users]);

  return { user, created: true };
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const users = await readUsers();
  const user = users.find((item) => item.email === normalizedEmail);

  if (!user || user.password !== password) return { user: null, reason: "invalid" as const };
  if (user.status === "frozen") return { user, reason: "frozen" as const };

  const now = new Date().toISOString();
  const nextUser = {
    ...user,
    lastLoginAt: now,
    loginRecords: [now, ...user.loginRecords].slice(0, 30),
  };
  await writeUsers(users.map((item) => (item.email === normalizedEmail ? nextUser : item)));

  return { user: nextUser, reason: null };
}

export async function updateUser(
  email: string,
  patch: Partial<Pick<UserProfile, "password" | "status">>,
) {
  const normalizedEmail = normalizeEmail(email);
  const users = await readUsers();
  const user = users.find((item) => item.email === normalizedEmail);

  if (!user) return null;

  const nextUser = {
    ...user,
    password: typeof patch.password === "string" && patch.password ? patch.password : user.password,
    status: patch.status === "active" || patch.status === "frozen" ? patch.status : user.status,
  };

  await writeUsers(users.map((item) => (item.email === normalizedEmail ? nextUser : item)));

  return nextUser;
}
