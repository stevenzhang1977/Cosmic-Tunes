// pages/api/callback.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getCookies, clearCookie, setSessionCookie } from "../../lib/session";

function getBaseUrl(req: NextApiRequest) {
  const proto =
    (req.headers["x-forwarded-proto"] as string) ||
    (req.headers["x-forwarded-protocol"] as string) ||
    "https";
  const host =
    (req.headers["x-forwarded-host"] as string) ||
    (req.headers.host as string) ||
    "localhost:3000";
  return `${proto}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    if (!code || !state) return res.status(400).send("Missing code/state");

    const cookies = getCookies(req);
    if (cookies["spotify_oauth_state"] !== state) return res.status(400).send("State mismatch");

    const codeVerifier = cookies["spotify_code_verifier"];
    if (!codeVerifier) return res.status(400).send("Missing code_verifier");

    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
    if (!clientId || !clientSecret) {
      console.error("Missing Spotify envs");
      return res.status(500).send("Server misconfig: missing Spotify env vars");
    }

    const redirectUri = `${getBaseUrl(req)}/api/callback`;

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    });

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const resp = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("Token exchange failed:", data);
      return res.status(400).json(data);
    }

    const expires_at = Date.now() + data.expires_in * 1000;
    setSessionCookie({ refresh_token: data.refresh_token, access_token: data.access_token, expires_at }, res);

    clearCookie("spotify_code_verifier", res);
    clearCookie("spotify_oauth_state", res);

    res.writeHead(302, { Location: "/choose" });
    res.end();
  } catch (err) {
    console.error("Callback fatal error:", err);
    res.status(500).send("Internal server error");
  }
}
