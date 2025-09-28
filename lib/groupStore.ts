// lib/groupStore.ts
import { kv } from "@vercel/kv";

export type MemberPayload = {
  id: string; // stable client id (e.g., crypto.randomUUID stored in localStorage)
  displayName?: string;
  topArtists: Array<{
    id: string;
    name: string;
    popularity?: number;
    image?: string;
    genres?: string[];
  }>;
};

const ROOM_TTL_SECONDS = 60 * 60 * 4; // 4 hours (adjust as you like)
const roomKey = (code: string) => `room:${code}`;

/**
 * Create a room if it doesn't already exist.
 * Uses NX so we don't overwrite existing rooms in a race.
 * Returns true if created, false if it already existed.
 */
export async function createRoom(code: string): Promise<boolean> {
  // set NX + EX to create only if not exists, with TTL
  // @vercel/kv maps to Upstash Redis SET with options
  const ok = await kv.set(roomKey(code), JSON.stringify([]), {
    ex: ROOM_TTL_SECONDS,
    nx: true,
  });
  // kv.set returns the value or null depending on options; treat truthy as created
  return Boolean(ok);
}

/**
 * Insert or update a member in the room; returns updated members array.
 * Also refreshes TTL on write so active rooms persist while in use.
 */
export async function upsertMember(code: string, member: MemberPayload): Promise<MemberPayload[]> {
  const key = roomKey(code);
  const raw = (await kv.get<string>(key)) || "[]";
  let arr: MemberPayload[] = [];
  try {
    arr = JSON.parse(raw);
  } catch {
    arr = [];
  }

  const idx = arr.findIndex((m) => m.id === member.id);
  if (idx >= 0) arr[idx] = member;
  else arr.push(member);

  await kv.set(key, JSON.stringify(arr), { ex: ROOM_TTL_SECONDS });
  return arr;
}

/**
 * Get members for a room code. (Returns empty array if missing/expired.)
 * Touches TTL optionally; set touch=true to extend.
 */
export async function getRoom(code: string, touch = false): Promise<MemberPayload[]> {
  const key = roomKey(code);
  const raw = (await kv.get<string>(key)) || "[]";
  let arr: MemberPayload[] = [];
  try {
    arr = JSON.parse(raw);
  } catch {
    arr = [];
  }

  if (touch && arr.length > 0) {
    // extend TTL without changing contents
    await kv.expire(key, ROOM_TTL_SECONDS);
  }

  return arr;
}
