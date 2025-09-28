import { serialize, parse } from "cookie";
import jwt from "jsonwebtoken";
import type { NextApiRequest, NextApiResponse } from "next";

const SECURE = process.env.COOKIE_SECURE === "true";
const JWT_SECRET = process.env.JWT_SECRET!; // set in env (Vercel + .env.local for dev)

export type TokenPayload = {
  refresh_token: string;
  access_token?: string;
  expires_at?: number; // epoch ms for access token expiry
};

/** Append (not overwrite) Set-Cookie headers */
function appendSetCookie(res: NextApiResponse, cookieStr: string) {
  const prev = res.getHeader("Set-Cookie");
  const next = Array.isArray(prev)
    ? [...prev, cookieStr]
    : prev
    ? [String(prev), cookieStr]
    : [cookieStr];
  res.setHeader("Set-Cookie", next);
}

/** Persistent cookie (defaults to 30 days) */
export function setCookie(
  name: string,
  value: string,
  res: NextApiResponse,
  maxAgeSeconds = 60 * 60 * 24 * 30
) {
  const cookieStr = serialize(name, value, {
    httpOnly: true,
    secure: SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
  appendSetCookie(res, cookieStr);
}

/** Short-lived cookie (defaults to 10 minutes) */
export function setTempCookie(
  name: string,
  value: string,
  res: NextApiResponse,
  maxAgeSeconds = 600
) {
  const cookieStr = serialize(name, value, {
    httpOnly: true,
    secure: SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
  appendSetCookie(res, cookieStr);
}

/** Clear a cookie */
export function clearCookie(name: string, res: NextApiResponse) {
  const cookieStr = serialize(name, "", {
    httpOnly: true,
    secure: SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  appendSetCookie(res, cookieStr);
}

/** Read cookies from a request */
export function getCookies(req: NextApiRequest) {
  const header = req.headers.cookie || "";
  return parse(header);
}

/** Write the JWT session cookie that stores refresh/access token info */
export function setSessionCookie(payload: TokenPayload, res: NextApiResponse) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET not set");
  }
  const token = jwt.sign(payload, JWT_SECRET, { algorithm: "HS256" });
  setCookie("session_jwt", token, res);
}

/** Decode the JWT session cookie (returns null if missing/invalid) */
export function getSessionFromCookie(req: NextApiRequest): TokenPayload | null {
  const { session_jwt } = getCookies(req);
  if (!session_jwt || !JWT_SECRET) return null;
  try {
    return jwt.verify(session_jwt, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/** Ensure we have a fresh access token; refresh using the refresh_token if needed */
export async function ensureFreshAccessToken(
  payload: TokenPayload
): Promise<{ accessToken: string; newPayload?: TokenPayload }> {
  const almostNow = Date.now() + 10_000;
  if (payload.access_token && payload.expires_at && payload.expires_at > almostNow) {
    return { accessToken: payload.access_token };
  }

  // Refresh flow with Spotify
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  if (!clientId || !clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: payload.refresh_token,
    client_id: clientId,
  });

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error("Refresh failed: " + JSON.stringify(data));
  }

  const newPayload: TokenPayload = {
    refresh_token: data.refresh_token || payload.refresh_token, // Spotify may rotate it
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return { accessToken: data.access_token, newPayload };
}
