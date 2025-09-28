// pages/api/login.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { randomString, sha256Base64Url } from "../../lib/pkce";
import { setTempCookie } from "../../lib/session";

function getBaseUrl(req: NextApiRequest) {
  // Vercel/Proxies send x-forwarded-* headers; fall back to Host
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
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const scope = ["user-top-read", "user-library-read", "playlist-read-private"].join(" ");

  console.log("Has SPOTIFY_CLIENT_ID?", Boolean(process.env.SPOTIFY_CLIENT_ID));

  if (!clientId) {
    console.error("Missing SPOTIFY_CLIENT_ID");
    return res.status(500).send("Server misconfiguration: missing Spotify client id");
  }

  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/callback`;

  const state = randomString(24);
  const codeVerifier = randomString(64);
  const codeChallenge = await sha256Base64Url(codeVerifier);

  setTempCookie("spotify_code_verifier", codeVerifier, res);
  setTempCookie("spotify_oauth_state", state, res);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope,
    state,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  });

  console.log("Authorize redirect_uri →", redirectUri);

  res.writeHead(302, { Location: `https://accounts.spotify.com/authorize?${params.toString()}` });
  res.end();
}
