import type { NextApiRequest, NextApiResponse } from "next";
import { getRoom } from "../../../lib/groupStore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  const code = (req.query.code as string || "").trim();
  if (!code) return res.status(400).json({ error: "bad_request" });

  const members = await getRoom(code, true); // touch TTL on read
  return res.status(200).json({ code, members });
}
