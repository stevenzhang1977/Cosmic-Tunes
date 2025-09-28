/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

type SimpleArtist = { id: string; name: string; popularity?: number; image?: string; genres?: string[] };
type Member = { id: string; displayName?: string; topArtists: SimpleArtist[] };

// Add a narrow type for the endpoint we call
type SpotifyTopResponse = {
  items: Array<{
    id: string;
    name: string;
    popularity?: number;
    images?: { url: string }[];
    genres?: string[];
  }>;
};

export default function Group() {
  const router = useRouter();
  const { host, code: codeParam } = router.query;
  const [code, setCode] = useState<string>(typeof codeParam === "string" ? codeParam : "");
  const [creating, setCreating] = useState(false);
  const [input, setInput] = useState("");
  const [me, setMe] = useState<{ id: string; displayName?: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  const myId = useMemo(() => {
    const k = "ct_client_id";
    try {
      const stored = localStorage.getItem(k);
      if (stored) return stored;
      const v = crypto.randomUUID();
      localStorage.setItem(k, v);
      return v;
    } catch {
      return Math.random().toString(36).slice(2);
    }
  }, []);

  useEffect(() => {
    if (host === "true" && !code) {
      (async () => {
        setCreating(true);
        try {
          const r = await fetch("/api/group/create", { method: "POST" });
          const j = await r.json();
          setCode(j.code);
        } finally {
          setCreating(false);
        }
      })();
    }
  }, [host, code]);

  useEffect(() => {
    setMe({ id: myId, displayName: "" });
  }, [myId]);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;

    async function fetchAndPublish() {
      try {
        const r = await fetch("/api/me/top?range=medium_term");
        const top: SpotifyTopResponse = await r.json();

        const items: SimpleArtist[] = (top.items ?? []).slice(0, 20).map((a) => ({
          id: a.id,
          name: a.name,
          popularity: a.popularity,
          image: a.images?.[0]?.url,
          genres: a.genres || [],
        }));

        await fetch("/api/group/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, member: { id: myId, displayName: me?.displayName, topArtists: items } }),
        });

        const rg = await fetch(`/api/group/get?code=${encodeURIComponent(code)}`);
        const gj = await rg.json();
        if (!cancelled) setMembers((gj.members as Member[]) || []);
      } catch (e) {
        console.error(e);
      }
    }

    fetchAndPublish();
    const t = setInterval(fetchAndPublish, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [code, myId, me?.displayName]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#0b1022,#1e293b)",
        color: "#fff",
        padding: 24,
        fontFamily: "Inter,system-ui,sans-serif",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Group Session</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        Create a session to share a code, or join an existing one. When ready, start the merged galaxy.
      </p>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Create Session</h2>
          {creating && <div>Creating...</div>}
          {!creating && code ? (
            <>
              <div style={{ opacity: 0.85, marginBottom: 8 }}>Share this code:</div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 2, marginBottom: 8 }}>{code}</div>
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/group?code=${code}`)}
                style={{ padding: "8px 12px", borderRadius: 8, background: "#334155", fontWeight: 600 }}
              >
                Copy Invite Link
              </button>
            </>
          ) : (
            <button
              onClick={async () => {
                setCreating(true);
                const r = await fetch("/api/group/create", { method: "POST" });
                const j = await r.json();
                setCode(j.code);
                setCreating(false);
              }}
              style={{ padding: "10px 14px", borderRadius: 10, fontWeight: 600, background: "#a855f7", marginTop: 8 }}
            >
              Create New Code
            </button>
          )}
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Join Session</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Enter session code"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              style={{
                flex: 1,
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 8,
                padding: "8px 10px",
                color: "#fff",
              }}
            />
            <button
              onClick={() => router.push(`/group?code=${encodeURIComponent(input.trim())}`)}
              style={{ padding: "8px 12px", borderRadius: 8, background: "#6366f1", fontWeight: 600 }}
            >
              Join
            </button>
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>Or open an invite link someone shared.</div>
        </div>
      </div>

      {code && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>People in session {code}:</h3>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
            {members.map((m) => (
              <div
                key={m.id}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{m.displayName || `Member ${m.id.slice(0, 6)}`}</div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Top artists:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(m.topArtists || []).slice(0, 6).map((a) => (
                    <span
                      key={a.id}
                      style={{
                        fontSize: 12,
                        opacity: 0.9,
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 999,
                        padding: "3px 8px",
                      }}
                    >
                      {a.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
            <button
              onClick={() => router.push(`/galaxy?mode=group&code=${encodeURIComponent(code)}`)}
              style={{ padding: "10px 14px", borderRadius: 10, fontWeight: 700, background: "#22c55e" }}
            >
              Start Merged Galaxy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
