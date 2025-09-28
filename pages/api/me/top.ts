// pages/api/me/top.ts
import type { NextApiRequest, NextApiResponse } from "next";
import {
  getSessionFromCookie,
  ensureFreshAccessToken,
  setSessionCookie,
} from "../../../lib/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = getSessionFromCookie(req);
    if (!payload) return res.status(401).json({ error: "not_authenticated" });

    const { accessToken, newPayload } = await ensureFreshAccessToken(payload);
    if (newPayload) setSessionCookie(newPayload, res);

    const range = (req.query.range as string) || "medium_term";
    const r = await fetch(
      `https://api.spotify.com/v1/me/top/artists?time_range=${encodeURIComponent(
        range
      )}&limit=30`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = (await r.json()) as unknown;
    return res.status(r.status).json(data);
  } catch (err) {
    console.error("(/api/me/top) error:", err);
    return res.status(500).json({ error: "server_error" });
  }
}
