import type { NextApiRequest, NextApiResponse } from "next";
import { upsertMember, MemberPayload } from "../../../lib/groupStore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  try {
    const { code, member } = req.body as { code: string; member: MemberPayload };
    if (!code || !member || !member.id) return res.status(400).json({ error: "bad_request" });

    const arr = await upsertMember(code, member);
    return res.status(200).json({ ok: true, size: arr.length });
  } catch (e) {
    console.error("group/publish error", e);
    return res.status(500).json({ error: "server_error" });
  }
}
