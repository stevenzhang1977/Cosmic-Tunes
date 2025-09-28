import type { NextApiRequest, NextApiResponse } from "next";
import { createRoom } from "../../../lib/groupStore";

function makeCode(len = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  // Try a few random codes; ensure uniqueness via createRoom (NX)
  for (let i = 0; i < 8; i++) {
    const code = makeCode();
    const created = await createRoom(code);
    if (created) {
      return res.status(200).json({ code });
    }
  }
  return res.status(503).json({ error: "unable_to_allocate_code" });
}
