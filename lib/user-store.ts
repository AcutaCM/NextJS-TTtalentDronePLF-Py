import fs from 'fs';
import path from 'path';
import { DEFAULT_ROLE, UserRole } from './roles';

type UserRecord = { email: string; role: UserRole };
type UserMap = Record<string, UserRole>;

const DATA_DIR = path.join(process.cwd(), 'drone-analyzer-nextjs', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2), 'utf-8');
}

export function getUserRole(email: string): UserRole {
  ensureStore();
  const raw = fs.readFileSync(USERS_FILE, 'utf-8');
  const map: UserMap = JSON.parse(raw || '{}');
  return (map[email.toLowerCase()] || DEFAULT_ROLE) as UserRole;
}

export function setUserRole(email: string, role: UserRole) {
  ensureStore();
  const raw = fs.readFileSync(USERS_FILE, 'utf-8');
  const map: UserMap = JSON.parse(raw || '{}');
  map[email.toLowerCase()] = role;
  fs.writeFileSync(USERS_FILE, JSON.stringify(map, null, 2), 'utf-8');
}

export function listUsers(): UserRecord[] {
  ensureStore();
  const raw = fs.readFileSync(USERS_FILE, 'utf-8');
  const map: UserMap = JSON.parse(raw || '{}');
  return Object.entries(map).map(([email, role]) => ({ email, role }));
}

export function hasAdmin(): boolean {
  ensureStore();
  const raw = fs.readFileSync(USERS_FILE, 'utf-8');
  const map: UserMap = JSON.parse(raw || '{}');
  return Object.values(map).some(role => role === 'admin');
}