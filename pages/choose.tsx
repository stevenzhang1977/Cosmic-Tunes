// pages/choose.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react";
import { useRouter } from "next/router";

// PIXI is injected globally in pages/_document.tsx (like on the galaxy page)
declare const PIXI: any;

const STAR_COUNT = 600;

export default function Choose() {
  const router = useRouter();
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof PIXI === "undefined") return;

    // Create PIXI app
    const app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x0f0b1c,
      resolution: window.devicePixelRatio || 1,
      resizeTo: window,
      antialias: true,
    });
    appRef.current = app;

    // Mount to container
    if (pixiContainerRef.current) {
      pixiContainerRef.current.innerHTML = "";
      pixiContainerRef.current.appendChild(app.view as HTMLCanvasElement);
    }

    // ---------- Starfield (parallax drift + twinkle + global tint drift) ----------
    const starfield = new PIXI.ParticleContainer(STAR_COUNT, {
      scale: true,
      alpha: true,
      position: true,
    });
    app.stage.addChild(starfield);

    // tiny white dot texture
    const dot = new PIXI.Graphics();
    dot.beginFill(0xffffff).drawCircle(0, 0, 1.2).endFill();
    const starTex = app.renderer.generateTexture(dot);

    for (let i = 0; i < STAR_COUNT; i++) {
      const s = new PIXI.Sprite(starTex);
      s.x = Math.random() * app.screen.width;
      s.y = Math.random() * app.screen.height;
      const layer = Math.random(); // depth layer 0..1
      s.scale.set(0.6 + 1.4 * layer);
      s.alpha = 0.3 + Math.random() * 0.7;
      (s as any).vx = (0.2 + Math.random() * 0.6) * (layer * 0.6 + 0.4);
      (s as any).vy = (0.15 + Math.random() * 0.5) * (layer * 0.6 + 0.4);
      (s as any).tw = Math.random() * Math.PI * 2; // twinkle phase
      (s as any).layer = layer;
      starfield.addChild(s);
    }

    // Slow hue drift for the whole starfield (same vibe as galaxy page)
    let hue = 210;
    const saturation = 0.08;
    const lightness = 0.95;
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

    // ---------- Shooting stars layer ----------
    const shootingLayer = new PIXI.Container();
    app.stage.addChild(shootingLayer);

    type Shooter = { sprite: any; vx: number; vy: number; life: number; maxLife: number };
    const shooters: Shooter[] = [];

    // simple white streak texture
    const streakGfx = new PIXI.Graphics();
    streakGfx.beginFill(0xffffff, 1).drawRoundedRect(-40, -1.5, 80, 3, 1.5).endFill();
    const streakTex = app.renderer.generateTexture(streakGfx);

    const spawnShootingStar = () => {
      const startEdge = Math.floor(Math.random() * 4);
      const s = new PIXI.Sprite(streakTex);
      s.alpha = 0;
      s.anchor.set(0.0, 0.5);

      const speed = 1200 + Math.random() * 600;
      const angle = (() => {
        switch (startEdge) {
          case 0: // top → down-right
            s.x = Math.random() * app.screen.width;
            s.y = -20;
            return Math.PI / 2 + (Math.random() * 0.5 - 0.25);
          case 1: // right → left
            s.x = app.screen.width + 20;
            s.y = Math.random() * app.screen.height * 0.6;
            return Math.PI + (Math.random() * 0.5 - 0.25);
          case 2: // bottom → up-left
            s.x = app.screen.width * (0.4 + Math.random() * 0.6);
            s.y = app.screen.height + 20;
            return -Math.PI / 2 + (Math.random() * 0.5 - 0.25);
          default: // left → right
            s.x = -20;
            s.y = app.screen.height * (0.4 + Math.random() * 0.6);
            return Math.random() * 0.5 - 0.25;
        }
      })();

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

    // ---------- Animate ----------
    let shootAccumulator = 0;

    app.ticker.add((delta: number) => {
      const dt = app.ticker.deltaMS / 1000;

      // Star drift + twinkle
      for (const s of starfield.children as any[]) {
        s.x -= s.vx * delta * 0.5;
        s.y += s.vy * delta * 0.2;
        if (s.x < -2) s.x = app.screen.width + 2;
        if (s.y > app.screen.height + 2) s.y = -2;
        s.alpha = 0.5 + 0.4 * Math.sin((s.tw += 0.01 + 0.02 * s.layer));
      }

      // subtle tint drift
      hue = (hue + 0.02) % 360;
      starfield.tint = hslToHex(hue, saturation, lightness);

      // Shooting stars
      shootAccumulator += dt;
      if (shootAccumulator > 1.5 && Math.random() < 0.008) {
        spawnShootingStar();
        shootAccumulator = 0;
      }
      for (let i = shooters.length - 1; i >= 0; i--) {
        const sh = shooters[i];
        sh.life += dt;
        const sp = sh.sprite;
        sp.x += sh.vx * dt;
        sp.y += sh.vy * dt;

        const t = sh.life / sh.maxLife;
        sp.alpha = t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.15) / 0.85);
        sp.scale.x = 1 + t * 0.4;

        const out =
          sp.x < -100 ||
          sp.y < -100 ||
          sp.x > app.screen.width + 100 ||
          sp.y > app.screen.height + 100;

        if (sh.life >= sh.maxLife || out) {
          shootingLayer.removeChild(sp);
          sp.destroy();
          shooters.splice(i, 1);
        }
      }
    });

    // Cleanup
    return () => {
      try {
        app.destroy(true, { children: true, texture: true, baseTexture: true });
      } catch {}
    };
  }, []);

  return (
    <>
      <style>{`
        body { margin: 0; padding: 0; overflow: hidden; font-family: 'Inter', system-ui, sans-serif; }
      `}</style>

      {/* PIXI background */}
      <div
        ref={pixiContainerRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none", // allow clicking through to the card
        }}
      />

      {/* Subtle vignette overlay like the galaxy page */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)",
          zIndex: 1,
        }}
      />

      {/* Center card + actions */}
      <main
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "min(560px, 92vw)",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16,
            boxShadow:
              "0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
            backdropFilter: "blur(10px)",
            padding: 24,
            color: "rgba(255,255,255,0.92)",
            textAlign: "left",
          }}
        >
          <h2
            style={{
              margin: "0 0 8px 0",
              fontFamily: "Space Grotesk, system-ui, sans-serif",
              fontSize: 28,
              fontWeight: 800,
              background: "linear-gradient(90deg,#ffffff,#63d4f1)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            How do you want to build your galaxy?
          </h2>

          <p style={{ margin: "0 0 16px 0", opacity: 0.8, textAlign: "center" }}>
            Choose solo for your personal universe, or create/join a shared
            session for a merged galaxy.
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            <button
              onClick={() => router.push("/galaxy")}
              style={buttonStyle({
                from: "#6d72ff",
                to: "#6ca8ff",
              })}
            >
              Solo (Personal Universe)
            </button>

            <button
              onClick={() => router.push("/group")}
              style={buttonStyle({
                from: "#a855f7",
                to: "#7c3aed",
              })}
            >
              Group (Create or Join a Session)
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

/* Helpers */
function buttonStyle(grad: { from: string; to: string }): React.CSSProperties {
  return {
    appearance: "none",
    border: "none",
    outline: "none",
    width: "100%",
    padding: "12px 16px",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    color: "#fff",
    background: `linear-gradient(90deg, ${grad.from}, ${grad.to})`,
    boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
    transition: "transform .12s ease, filter .12s ease",
  } as React.CSSProperties;
}
