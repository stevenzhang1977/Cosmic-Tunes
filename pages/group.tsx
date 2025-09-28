// pages/group.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

/* ---------------- Types for your data ---------------- */
type SimpleArtist = { id: string; name: string; popularity?: number; image?: string; genres?: string[] };
type Member = { id: string; displayName?: string; topArtists: SimpleArtist[] };

type SpotifyTopResponse = {
  items: Array<{
    id: string;
    name: string;
    popularity?: number;
    images?: { url: string }[];
    genres?: string[];
  }>;
};

/* ---------------- Minimal PIXI typings (no any) ---------------- */
interface PixiScale { set: (v: number) => void; x?: number; y?: number }
interface PixiSprite {
  x: number; y: number; alpha?: number; rotation?: number;
  width?: number; height?: number; tint?: number;
  scale?: PixiScale; anchor?: { set: (x: number, y?: number) => void };
  destroy?: () => void;
}
interface PixiGraphics {
  beginFill: (color: number, alpha?: number) => PixiGraphics;
  drawCircle: (x: number, y: number, r: number) => PixiGraphics;
  drawRoundedRect: (x: number, y: number, w: number, h: number, r: number) => PixiGraphics;
  endFill: () => PixiGraphics;
}
interface PixiContainer {
  addChild: (...children: (PixiSprite | PixiGraphics | PixiContainer)[]) => void;
  removeChild: (child: PixiSprite | PixiGraphics | PixiContainer) => void;
  children: unknown[];
}
type PixiParticleContainer = PixiContainer;
interface PixiRenderer { generateTexture: (g: PixiGraphics) => unknown }
interface PixiTicker { add: (fn: (delta: number) => void) => void; deltaMS: number }
interface PixiApplication {
  view: HTMLCanvasElement;
  screen: { width: number; height: number };
  renderer: PixiRenderer;
  stage: PixiContainer;
  ticker: PixiTicker;
  destroy: (removeView?: boolean, opts?: { children?: boolean; texture?: boolean; baseTexture?: boolean }) => void;
}
interface PixiNamespace {
  Application: new (opts: {
    width: number; height: number; backgroundColor: number; resolution: number; resizeTo: Window; antialias?: boolean;
  }) => PixiApplication;
  Container: new () => PixiContainer;
  ParticleContainer: new (count?: number, properties?: Record<string, boolean>) => PixiParticleContainer;
  Graphics: new () => PixiGraphics;
  Sprite: new (tex?: unknown) => PixiSprite;
}

declare const PIXI: PixiNamespace;
/* ---------------------------------------------------- */

const STAR_COUNT = 600;

export default function Group() {
  const router = useRouter();
  const { host, code: codeParam } = router.query;
  const [code, setCode] = useState<string>(typeof codeParam === "string" ? codeParam : "");
  const [creating, setCreating] = useState(false);
  const [input, setInput] = useState("");
  const [me, setMe] = useState<{ id: string; displayName?: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  // PIXI refs
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PixiApplication | null>(null);

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

  // create a session if ?host=true and no code present
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

  // publish my top artists and poll members
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

  // PIXI starfield + shooting stars
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof PIXI === "undefined") return;

    const app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x0f0b1c,
      resolution: window.devicePixelRatio || 1,
      resizeTo: window,
      antialias: true,
    });
    appRef.current = app;

    if (pixiContainerRef.current) {
      pixiContainerRef.current.innerHTML = "";
      pixiContainerRef.current.appendChild(app.view);
    }

    const starfield = new PIXI.ParticleContainer(STAR_COUNT, {
      scale: true,
      alpha: true,
      position: true,
    });

    app.stage.addChild(starfield);

    const dot = new PIXI.Graphics();
    dot.beginFill(0xffffff).drawCircle(0, 0, 1.2).endFill();
    const starTex = app.renderer.generateTexture(dot);

    for (let i = 0; i < STAR_COUNT; i++) {
      const s = new PIXI.Sprite(starTex);
      s.x = Math.random() * app.screen.width;
      s.y = Math.random() * app.screen.height;
      const layer = Math.random();
      s.scale = s.scale ?? { set: () => {} };
      s.scale.set(0.6 + 1.4 * layer);
      s.alpha = 0.3 + Math.random() * 0.7;

      const w = s as PixiSprite & { vx: number; vy: number; tw: number; layer: number };
      w.vx = (0.2 + Math.random() * 0.6) * (layer * 0.6 + 0.4);
      w.vy = (0.15 + Math.random() * 0.5) * (layer * 0.6 + 0.4);
      w.tw = Math.random() * Math.PI * 2;
      w.layer = layer;

      starfield.addChild(s);
    }

    // hue drift
    const hslToHex = (h: number, s: number, l: number) => {
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const hp = h / 60;
      const x = c * (1 - Math.abs((hp % 2) - 1));
      let r = 0, g = 0, b = 0;
      if (0 <= hp && hp < 1) [r, g, b] = [c, x, 0];
      else if (1 <= hp && hp < 2) [r, g, b] = [x, c, 0];
      else if (2 <= hp && hp < 3) [r, g, b] = [0, c, x];
      else if (3 <= hp && hp < 4) [r, g, b] = [0, x, c];
      else if (4 <= hp && hp < 5) [r, g, b] = [x, 0, c];
      else if (5 <= hp && hp < 6) [r, g, b] = [c, 0, x];
      const m = l - c / 2;
      const rr = Math.round((r + m) * 255);
      const gg = Math.round((g + m) * 255);
      const bb = Math.round((b + m) * 255);
      return (rr << 16) + (gg << 8) + bb;
    };

    let hue = 210;
    const saturation = 0.08;
    const lightness = 0.95;

    const shootingLayer = new PIXI.Container();
    app.stage.addChild(shootingLayer);

    type Shooter = { sprite: PixiSprite; vx: number; vy: number; life: number; maxLife: number };
    const shooters: Shooter[] = [];

    const streakGfx = new PIXI.Graphics();
    streakGfx.beginFill(0xffffff, 1).drawRoundedRect(-40, -1.5, 80, 3, 1.5).endFill();
    const streakTex = app.renderer.generateTexture(streakGfx);

    const spawnShootingStar = () => {
      const startEdge = Math.floor(Math.random() * 4);
      const s = new PIXI.Sprite(streakTex);
      s.alpha = 0;
      s.anchor = s.anchor ?? { set: () => {} };
      s.anchor.set(0.0, 0.5);

      const speed = 1200 + Math.random() * 600;
      let angle = 0;

      switch (startEdge) {
        case 0:
          s.x = Math.random() * app.screen.width;
          s.y = -20;
          angle = Math.PI / 2 + (Math.random() * 0.5 - 0.25);
          break;
        case 1:
          s.x = app.screen.width + 20;
          s.y = Math.random() * app.screen.height * 0.6;
          angle = Math.PI + (Math.random() * 0.5 - 0.25);
          break;
        case 2:
          s.x = app.screen.width * (0.4 + Math.random() * 0.6);
          s.y = app.screen.height + 20;
          angle = -Math.PI / 2 + (Math.random() * 0.5 - 0.25);
          break;
        default:
          s.x = -20;
          s.y = app.screen.height * (0.4 + Math.random() * 0.6);
          angle = Math.random() * 0.5 - 0.25;
      }

      s.rotation = angle;
      shootingLayer.addChild(s);

      shooters.push({
        sprite: s,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.9 + Math.random() * 0.7,
      });
    };

    let shootAccumulator = 0;

    app.ticker.add((delta: number) => {
      const dt = app.ticker.deltaMS / 1000;

      // star drift + twinkle
      for (const child of starfield.children as unknown[]) {
        const s = child as PixiSprite & { vx: number; vy: number; tw: number; layer: number };
        s.x -= s.vx * delta * 0.5;
        s.y += s.vy * delta * 0.2;
        if (s.x < -2) s.x = app.screen.width + 2;
        if (s.y > app.screen.height + 2) s.y = -2;
        s.alpha = 0.5 + 0.4 * Math.sin((s.tw += 0.01 + 0.02 * s.layer));
      }

      // tint drift
      (starfield as unknown as { tint?: number }).tint = hslToHex((hue = (hue + 0.02) % 360), saturation, lightness);

      // shooting stars
      shootAccumulator += dt;
      if (shootAccumulator > 1.5 && Math.random() < 0.008) {
        spawnShootingStar();
        shootAccumulator = 0;
      }

      for (let i = shooters.length - 1; i >= 0; i--) {
        const sh = shooters[i];
        const sp = sh.sprite;
        sh.life += dt;
        sp.x += sh.vx * dt;
        sp.y += sh.vy * dt;

        const t = sh.life / sh.maxLife;
        sp.alpha = t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.15) / 0.85);
        if (!sp.scale) sp.scale = { set: () => {} };
        sp.scale.set(1 + t * 0.4);

        const out =
          sp.x < -100 ||
          sp.y < -100 ||
          sp.x > app.screen.width + 100 ||
          sp.y > app.screen.height + 100;

        if (sh.life >= sh.maxLife || out) {
          shootingLayer.removeChild(sp);
          if (sp.destroy) sp.destroy();
          shooters.splice(i, 1);
        }
      }
    });

    return () => {
      app.destroy(true, { children: true, texture: true, baseTexture: true });
    };
  }, []);

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 16,
    backdropFilter: "blur(8px)",
  };

  return (
    <>
      <style>{`body{margin:0;padding:0;overflow:hidden;font-family:Inter,system-ui,sans-serif}`}</style>

      {/* PIXI background */}
      <div ref={pixiContainerRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />

      {/* Vignette overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)",
          zIndex: 1,
        }}
      />

      {/* Content */}
      <main style={{ position: "relative", zIndex: 2, minHeight: "100vh", color: "#fff", padding: 24 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            marginBottom: 8,
            fontFamily: "Space Grotesk, system-ui, sans-serif",
            background: "linear-gradient(90deg,#ffffff,#63d4f1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Group Session
        </h1>
        <p style={{ opacity: 0.8, marginBottom: 16 }}>
          Create a session to share a code, or join an existing one. When ready, start the merged galaxy.
        </p>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Create Session</h2>
            {creating && <div>Creating...</div>}
            {!creating && code ? (
              <>
                <div style={{ opacity: 0.85, marginBottom: 8 }}>Share this code:</div>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 2, marginBottom: 8 }}>{code}</div>
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/group?code=${code}`)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    fontWeight: 600,
                    color: "#fff",
                  }}
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
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontWeight: 700,
                  background: "linear-gradient(90deg,#a855f7,#7c3aed)",
                  color: "#fff",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
                  marginTop: 8,
                }}
              >
                Create New Code
              </button>
            )}
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Join Session</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="Enter session code"
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                style={{
                  flex: 1,
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  color: "#fff",
                  outline: "none",
                }}
              />
              <button
                onClick={() => router.push(`/group?code=${encodeURIComponent(input.trim())}`)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontWeight: 700,
                  color: "#fff",
                  background: "linear-gradient(90deg,#6d72ff,#6ca8ff)",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
                }}
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
                    backdropFilter: "blur(6px)",
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
                disabled={members.length === 0}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontWeight: 700,
                  color: "#fff",
                  background: members.length === 0
                    ? "rgba(51,65,85,0.8)"
                    : "linear-gradient(90deg,#10b981,#22c55e)",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
                  cursor: members.length === 0 ? "not-allowed" : "pointer",
                  opacity: members.length === 0 ? 0.7 : 1,
                }}
                title={members.length === 0 ? "Waiting for members to publish…" : "Open merged galaxy"}
              >
                {members.length === 0 ? "Waiting for members…" : `Start Merged Galaxy (${members.length})`}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
