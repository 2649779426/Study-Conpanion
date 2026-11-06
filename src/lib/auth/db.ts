import "server-only";

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";
import { createSeedStore } from "@/lib/seed";
import type { AppStore } from "@/lib/types";

export type UserRecord = {
  id: string;
  phone: string;
  passwordHash: string;
  createdAt: string;
};

type UsersFile = {
  users: UserRecord[];
};

function dataRoot() {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}

function usersPath() {
  return path.join(dataRoot(), "users.json");
}

function storePath(userId: string) {
  return path.join(dataRoot(), "stores", `${userId}.json`);
}

function ensureDirs() {
  mkdirSync(path.join(dataRoot(), "stores"), { recursive: true });
}

function writeJsonAtomic(filePath: string, data: unknown) {
  ensureDirs();
  const tmp = `${filePath}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  renameSync(tmp, filePath);
}

function readUsers(): UsersFile {
  ensureDirs();
  try {
    const raw = readFileSync(usersPath(), "utf8");
    const parsed = JSON.parse(raw) as UsersFile;
    return { users: Array.isArray(parsed.users) ? parsed.users : [] };
  } catch {
    return { users: [] };
  }
}

function writeUsers(file: UsersFile) {
  writeJsonAtomic(usersPath(), file);
}

export function findUserByPhone(phone: string) {
  return readUsers().users.find((u) => u.phone === phone) ?? null;
}

export function findUserById(userId: string) {
  return readUsers().users.find((u) => u.id === userId) ?? null;
}

export function createUser(phone: string, passwordHash: string) {
  const file = readUsers();
  if (file.users.some((u) => u.phone === phone)) {
    throw new Error("PHONE_EXISTS");
  }
  const user: UserRecord = {
    id: `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    phone,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  file.users.push(user);
  writeUsers(file);
  const seed = createSeedStore();
  writeUserStore(user.id, {
    ...seed,
    userName: "同学",
    plan: null,
    checkIns: [],
  });
  return user;
}

export function readUserStore(userId: string): AppStore {
  ensureDirs();
  try {
    const raw = readFileSync(storePath(userId), "utf8");
    return { ...createSeedStore(), ...JSON.parse(raw) } as AppStore;
  } catch {
    const seed = createSeedStore();
    writeUserStore(userId, seed);
    return seed;
  }
}

export function writeUserStore(userId: string, store: AppStore) {
  writeJsonAtomic(storePath(userId), store);
}

export function isValidPhone(phone: string) {
  return /^1[3-9]\d{9}$/.test(phone);
}

export function isValidPassword(password: string) {
  return password.length >= 6 && password.length <= 64;
}
