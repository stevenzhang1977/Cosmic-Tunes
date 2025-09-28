/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";

// PIXI + D3 are loaded globally in pages/_document.tsx
declare const PIXI: any;
declare const d3: any;

/* ---------- Types ---------- */
type ArtistImage = { url: string; height?: number; width?: number };
interface SpotifyArtist {
  id: string;
  name: string;
  popularity?: number;
  genres?: string[];
  images?: ArtistImage[];
  spotifyUrl?: string;
}
interface ArtistNode extends SpotifyArtist {
  color?: number;
  fx?: number | null;
  fy?: number | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
}
interface ArtistLink {
  source: ArtistNode | string;
  target: ArtistNode | string;
  similarity: number;
}
interface GalaxyData {
  nodes: ArtistNode[];
  links: ArtistLink[];
}

/* ---------- Config & utilities ---------- */
const USERNAME = "Cosmic Voyager";
const MOCK_USER_ID = "4e3a-bcc8-e896094279f4";
const STAR_COUNT = 600; // background stars

const genreColorMap: { [key: string]: number } = {
  Pop: 0xff69b4,
  Electro: 0x00ffff,
  Rock: 0xff4500,
  Metal: 0x808080,
  "R&B": 0x9370db,
  Jazz: 0x8a2be2,
  Breakcore: 0x4682b4,
  Shoegaze: 0x6a5acd,
  Trance: 0xadd8e6,
  Soul: 0x90ee90,
  House: 0xffff00,
  Folk: 0xffefd5,
  Thrash: 0xdaa520,
  "jazz rap": 0x98ff98,
  "jazz fusion": 0x3cb371,
  "japanese classical": 0xda70d6,
  anime: 0xffb6c1,
  Chillhop: 0x5f9ea0,
  Hardcore: 0xff0000,
  Electronic: 0x00ff7f,
  "Dream Pop": 0x4169e1,
  "Hip Hop": 0xff8c00,
  Rap: 0x008000,
};

const getArtistColor = (genres: string[]): number => {
  if (!genres || genres.length === 0) return 0xffffff;
  for (const genre of genres) {
    const key = Object.keys(genreColorMap).find((k) =>
      genre.toLowerCase().includes(k.toLowerCase())
    );
    if (key) return genreColorMap[key];
  }
  return 0xffffff;
};

const processData = (rawArtists: SpotifyArtist[]): GalaxyData => {
  const nodes: ArtistNode[] = rawArtists.map((artist) => ({
    ...artist,
    spotifyUrl: `https://open.spotify.com/artist/${artist.id}`,
    color: getArtistColor(artist.genres || []),
    x: Math.random() * 1000,
    y: Math.random() * 1000,
    vx: 0,
    vy: 0,
  }));

  const links: ArtistLink[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const A = nodes[i].genres || [];
      const B = nodes[j].genres || [];
      const shared = A.filter((g) => B.includes(g));
      if (shared.length > 0) {
        const similarity = shared.length / Math.min(A.length || 1, B.length || 1);
        if (similarity > 0.1) links.push({ source: nodes[i].id, target: nodes[j].id, similarity });
      }
    }
  }
  return { nodes, links };
};

function hslToHex(h: number, s: number, l: number) {
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
}

/* ---------- Component ---------- */
export default function Galaxy() {
  const router = useRouter();
  const { mode, code } = router.query as { mode?: string; code?: string };
  const isGroup = mode === "group" && !!code;

  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; genres: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mergeModalVisible, setMergeModalVisible] = useState(false);

  // PIXI/D3 refs
  const linksContainerRef = useRef<any>(null);
  const nebulasLayerRef = useRef<any>(null);
  const cameraContainerRef = useRef<any>(null);
  const pixiAppRef = useRef<any>(null);
  const simulationRef = useRef<any>(null);

  // Pan/zoom via refs (prevents re-init)
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // One-time guard
  const bootedRef = useRef(false);

  // Data loader
  const fetchGalaxyData = useCallback(async (): Promise<GalaxyData> => {
    setIsLoading(true);
    try {
      if (isGroup && code) {
        const r = await fetch(`/api/group/get?code=${encodeURIComponent(code)}`);
        if (!r.ok) {
          console.error("Group get failed:", await r.text());
          return { nodes: [], links: [] };
        }
        const j = await r.json();
        const all: SpotifyArtist[] = [];
        for (const m of j.members || []) {
          for (const a of m.topArtists || []) {
            all.push({
              id: a.id,
              name: a.name,
              genres: a.genres,
              popularity: a.popularity,
              images: a.image ? [{ url: a.image }] : undefined,
            });
          }
        }
        const seen = new Set<string>();
        const unique = all.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
        return processData(unique);
      }

      const response = await fetch("/api/me/top?range=medium_term");
      if (!response.ok) {
        console.error("Top artists failed:", response.status, await response.text());
        return { nodes: [], links: [] };
      }
      const data: { items: SpotifyArtist[] } = await response.json();
      return processData(data.items);
    } catch (err) {
      console.error("Galaxy data fetch error:", err);
      return { nodes: [], links: [] };
    } finally {
      setIsLoading(false);
    }
  }, [isGroup, code]);

  // Save PNG
  const saveScreenshot = () => {
    const canvas = pixiContainerRef.current?.querySelector("canvas");
    if (!canvas) return;

    const legend = document.getElementById("galaxy-legend");
    const navbar = document.getElementById("galaxy-navbar");
    if (legend) legend.style.display = "none";
    if (navbar) navbar.style.display = "none";

    const app = pixiAppRef.current;
    let dataURL = "";
    if (app && app.renderer?.extract) {
      dataURL = app.renderer.extract.base64(app.stage, "image/png");
    } else {
      dataURL = canvas.toDataURL("image/png");
    }

    const a = document.createElement("a");
    a.href = dataURL;
    a.download = `${USERNAME}_CosmicTune_Galaxy.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (legend) legend.style.display = "block";
    if (navbar) navbar.style.display = "flex";
  };

  // ---------- Main init ----------
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof PIXI === "undefined" || typeof d3 === "undefined") return;
    if (bootedRef.current) return;
    bootedRef.current = true;

    let handleWheel: (e: WheelEvent) => void;
    let startPan: (e: any) => void;
    let onPan: (e: any) => void;
    let stopPan: () => void;

    const initialize = async () => {
      let pixiApp: any;
      let cameraContainer: any;

      try {
        const data = await fetchGalaxyData();
        const nodes = data.nodes;
        const linksData = data.links;

        if (nodes.length === 0) {
          setIsLoading(false);
          return;
        }

        // ---------- PIXI app ----------
        pixiApp = new PIXI.Application({
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundColor: 0x0f0b1c,
          resolution: window.devicePixelRatio || 1,
          resizeTo: window,
        });
        pixiAppRef.current = pixiApp;

        if (pixiContainerRef.current) {
          pixiContainerRef.current.innerHTML = "";
          pixiContainerRef.current.appendChild(pixiApp.view as HTMLCanvasElement);
        }

        // ---------- BACKGROUND STARFIELD ----------
        const starfield = new PIXI.ParticleContainer(STAR_COUNT, {
          scale: true,
          alpha: true,
          position: true,
        });
        pixiApp.stage.addChild(starfield); // behind everything

        const dot = new PIXI.Graphics();
        dot.beginFill(0xffffff).drawCircle(0, 0, 1.2).endFill();
        const starTex = pixiApp.renderer.generateTexture(dot);

        for (let i = 0; i < STAR_COUNT; i++) {
          const s = new PIXI.Sprite(starTex);
          s.x = Math.random() * pixiApp.screen.width;
          s.y = Math.random() * pixiApp.screen.height;
          const layer = Math.random();
          s.scale.set(0.6 + 1.4 * layer);
          s.alpha = 0.3 + Math.random() * 0.7;
          (s as any).vx = (0.2 + Math.random() * 0.6) * (layer * 0.6 + 0.4);
          (s as any).vy = (0.15 + Math.random() * 0.5) * (layer * 0.6 + 0.4);
          (s as any).tw = Math.random() * Math.PI * 2;
          (s as any).layer = layer;
          starfield.addChild(s);
        }

        // global color drift
        let hue = 210;
        const saturation = 0.08;
        const lightness = 0.95;
        const updateStarfieldTint = () => {
          hue = (hue + 0.02) % 360;
          starfield.tint = hslToHex(hue, saturation, lightness);
        };

        // ---------- SHOOTING STARS ----------
        const shootingLayer = new PIXI.Container();
        pixiApp.stage.addChild(shootingLayer);

        type Shooter = { sprite: any; vx: number; vy: number; life: number; maxLife: number };
        const shooters: Shooter[] = [];

        const streakGfx = new PIXI.Graphics();
        streakGfx.beginFill(0xffffff, 1).drawRoundedRect(-40, -1.5, 80, 3, 1.5).endFill();
        const streakTex = pixiApp.renderer.generateTexture(streakGfx);
        const spawnShootingStar = () => {
          const startEdge = Math.floor(Math.random() * 4);
          const s = new PIXI.Sprite(streakTex);
          s.alpha = 0;
          s.anchor.set(0.0, 0.5);
          const speed = 1200 + Math.random() * 600;
          const angle = (() => {
            switch (startEdge) {
              case 0:
                s.x = Math.random() * pixiApp.screen.width;
                s.y = -20;
                return Math.PI / 2 + (Math.random() * 0.5 - 0.25);
              case 1:
                s.x = pixiApp.screen.width + 20;
                s.y = Math.random() * pixiApp.screen.height * 0.6;
                return Math.PI + (Math.random() * 0.5 - 0.25);
              case 2:
                s.x = pixiApp.screen.width * (0.4 + Math.random() * 0.6);
                s.y = pixiApp.screen.height + 20;
                return -Math.PI / 2 + (Math.random() * 0.5 - 0.25);
              default:
                s.x = -20;
                s.y = pixiApp.screen.height * (0.4 + Math.random() * 0.6);
                return Math.random() * 0.5 - 0.25;
            }
          })();
          s.rotation = angle;
          shootingLayer.addChild(s);
          shooters.push({ sprite: s, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0, maxLife: 0.9 + Math.random() * 0.7 });
        };

        // ---------- CAMERA CONTAINER ----------
        cameraContainer = new PIXI.Container();
        pixiApp.stage.addChild(cameraContainer);
        cameraContainerRef.current = cameraContainer;

        // NEW: Nebulas layer (under links/nodes) for purple aura
        const nebulas = new PIXI.Graphics();
        nebulas.blendMode = PIXI.BLEND_MODES.ADD;
        nebulasLayerRef.current = nebulas;
        nebulas.filters = [new PIXI.filters.BlurFilter(30)];
        cameraContainer.addChild(nebulas);

        const linksG = new PIXI.Graphics();
        const glowNodes = new PIXI.Container();
        const nodesC = new PIXI.Container();
        cameraContainer.addChild(linksG);
        cameraContainer.addChild(glowNodes);
        cameraContainer.addChild(nodesC);
        linksContainerRef.current = linksG;

        // ---------- D3 simulation ----------
        const simulation = d3
          .forceSimulation(nodes)
          .force(
            "link",
            d3
              .forceLink(linksData)
              .id((d: ArtistNode) => d.id)
              .distance(150)
              .strength((d: ArtistLink) => d.similarity * 0.8)
          )
          .force("charge", d3.forceManyBody().strength(-1500).distanceMax(800))
          .force("center", d3.forceCenter(pixiApp.screen.width / 2, pixiApp.screen.height / 2))
          .force("x", d3.forceX(pixiApp.screen.width / 2).strength(0.05))
          .force("y", d3.forceY(pixiApp.screen.height / 2).strength(0.05));
        simulationRef.current = simulation;

        // Degrees for cluster strength (for nebula sizing)
        const degree = new Map<string, number>();
        nodes.forEach((n) => degree.set(n.id, 0));
        linksData.forEach((l) => {
          const sid = (l.source as ArtistNode | string) as any;
          const tid = (l.target as ArtistNode | string) as any;
          const sId = typeof sid === "string" ? sid : sid.id;
          const tId = typeof tid === "string" ? tid : tid.id;
          degree.set(sId, (degree.get(sId) || 0) + 1);
          degree.set(tId, (degree.get(tId) || 0) + 1);
        });

        // ---------- Nodes + glow + wobble ----------
        const minR = 5, maxR = 25;
        const maxPop = d3.max(nodes, (d: ArtistNode) => d.popularity) || 100;

        const starTexture = PIXI.Texture.from(
          `<svg width="100" height="100">
            <radialGradient id="grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" style="stop-color:white;stop-opacity:1" />
              <stop offset="100%" style="stop-color:white;stop-opacity:0" />
            </radialGradient>
            <circle cx="50" cy="50" r="48" fill="url(#grad)" />
          </svg>`
        );

        // time accumulator for spin
        let tSec = 0;

        nodes.forEach((node: ArtistNode) => {
          const radius = minR + (maxR - minR) * (((node.popularity ?? 50) - 50) / ((maxPop ?? 100) - 50));
          const color = node.color || 0xffffff;

          const c = new PIXI.Container();

          const glow = new PIXI.Sprite(starTexture);
          glow.tint = color;
          glow.alpha = 0.3;
          glow.width = radius * 6;
          glow.height = radius * 6;
          glow.anchor.set(0.5);
          glowNodes.addChild(glow);

          const core = new PIXI.Graphics();
          core.beginFill(color);
          core.drawCircle(0, 0, radius * 0.5);
          core.endFill();
          c.addChild(core);

          const label = new PIXI.Text(node.name.toUpperCase(), {
            fontFamily: "Space Grotesk",
            fontSize: 10,
            fill: 0xffffff,
            fontWeight: "bold",
          });
          label.anchor.set(0.5, -1.5);
          c.addChild(label);

          c.interactive = true;
          c.cursor = "pointer";
          (c as any).glowSprite = glow;
          (c as any).d3Node = node;

          // NEW: tiny orbit wobble settings (spin-in-place feel)
          (c as any).wobble = {
            phase: Math.random() * Math.PI * 2,
            speed: 0.4 + Math.random() * 0.6,   // radians/sec multiplier
            radius: 2 + Math.random() * 3       // px offset
          };

          // subtle rotation for glow only (nebula-like)
          (c as any).glowSpin = (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1);

          c.on("pointerdown", (e: any) => {
            e.stopPropagation();
            const localPos = cameraContainer.toLocal(e.data.global);
            (c as any).d3Node.fx = localPos.x;
            (c as any).d3Node.fy = localPos.y;
            simulation.alphaTarget(0.1).restart();
            (c as any).dragging = true;
          });

          c.on("pointermove", (e: any) => {
            if ((c as any).dragging) {
              const localPos = cameraContainer.toLocal(e.data.global);
              (c as any).d3Node.fx = localPos.x;
              (c as any).d3Node.fy = localPos.y;
              setTooltip(null);
            } else {
              const pos = cameraContainer.toGlobal(c.position);
              setTooltip({ x: pos.x + 10, y: pos.y - 10, name: node.name, genres: node.genres || [] });
              c.alpha = 0.7;
            }
          });

          c.on("pointerup", () => {
            (c as any).dragging = false;
            (c as any).d3Node.fx = null;
            (c as any).d3Node.fy = null;
            simulation.alphaTarget(0);
          });
          c.on("pointerupoutside", () => {
            (c as any).dragging = false;
            (c as any).d3Node.fx = null;
            (c as any).d3Node.fy = null;
            simulation.alphaTarget(0);
          });
          c.on("pointerout", () => {
            if (!(c as any).dragging) {
              setTooltip(null);
              c.alpha = 1;
            }
          });
          c.on("pointertap", () => {
            const url = (node as any).spotifyUrl || `https://open.spotify.com/artist/${node.id}`;
            window.open(url, "_blank");
          });

          nodesC.addChild(c);
        });

        // ---------- Pan/zoom ----------
        handleWheel = (e: WheelEvent) => {
          if (!cameraContainerRef.current || !pixiAppRef.current) return;
          e.preventDefault();
          const zoomFactor = 1.1;
          const direction = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
          let newZoom = cameraContainerRef.current.scale.x * direction;
          newZoom = Math.max(0.2, Math.min(3.0, newZoom));
          cameraContainerRef.current.scale.set(newZoom);

          const app = pixiAppRef.current;
          const mouseX = e.clientX - app.view.offsetLeft;
          const mouseY = e.clientY - app.view.offsetTop;
          const point = new PIXI.Point(mouseX, mouseY);
          const localPoint = cameraContainer.toLocal(point);
          cameraContainerRef.current.pivot.set(localPoint.x, localPoint.y);
          cameraContainerRef.current.position.set(mouseX, mouseY);
        };
        pixiApp.view.addEventListener("wheel", handleWheel as any, { passive: false });

        startPan = (e: any) => {
          if (!cameraContainerRef.current || isPanningRef.current) return;
          isPanningRef.current = true;
          const g = e.data.global;
          panStartRef.current = { x: g.x - cameraContainerRef.current.x, y: g.y - cameraContainerRef.current.y };
        };
        onPan = (e: any) => {
          if (!isPanningRef.current || !cameraContainerRef.current) return;
          const g = e.data.global;
          cameraContainerRef.current.x = g.x - panStartRef.current.x;
          cameraContainerRef.current.y = g.y - panStartRef.current.y;
        };
        stopPan = () => { isPanningRef.current = false; };

        pixiApp.stage.interactive = true;
        pixiApp.stage.hitArea = pixiApp.screen;
        pixiApp.stage.on("mousedown", startPan);
        pixiApp.stage.on("touchstart", startPan);
        pixiApp.stage.on("mousemove", onPan);
        pixiApp.stage.on("touchmove", onPan);
        pixiApp.stage.on("mouseup", stopPan);
        pixiApp.stage.on("touchend", stopPan);
        pixiApp.stage.on("mouseupoutside", stopPan);
        pixiApp.stage.on("touchendoutside", stopPan);

        // ---------- Animate background + extras ----------
        let shootAccumulator = 0;
        pixiApp.ticker.add((delta: number) => {
          const dt = pixiApp.ticker.deltaMS / 1000; // seconds
          tSec += dt;

          // background drifts + twinkles
          for (const s of starfield.children as any[]) {
            s.x -= s.vx * delta * 0.5;
            s.y += s.vy * delta * 0.2;
            if (s.x < -2) s.x = pixiApp.screen.width + 2;
            if (s.y > pixiApp.screen.height + 2) s.y = -2;
            s.alpha = 0.5 + 0.4 * Math.sin((s.tw += 0.01 + 0.02 * s.layer));
          }
          updateStarfieldTint();

          // shooting stars
          shootAccumulator += dt;
          if (shootAccumulator > 1.5 && Math.random() < 0.008) {
            spawnShootingStar();
            shootAccumulator = 0;
          }
          for (let i = shooters.length - 1; i >= 0; i--) {
            const sh = shooters[i];
            sh.life += dt;
            const s = sh.sprite;
            s.x += sh.vx * dt;
            s.y += sh.vy * dt;
            const t = sh.life / sh.maxLife;
            s.alpha = t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.15) / 0.85);
            s.scale.x = 1 + t * 0.4;
            const out = s.x < -100 || s.y < -100 || s.x > pixiApp.screen.width + 100 || s.y > pixiApp.screen.height + 100;
            if (sh.life >= sh.maxLife || out) {
              shootingLayer.removeChild(s); s.destroy(); shooters.splice(i, 1);
            }
          }

          // parallax tracking for layers
          if (cameraContainerRef.current) {
            const cam = cameraContainerRef.current;
            const parallax = 0.2;
            const scale = 1 + (cam.scale.x - 1) * parallax;
            starfield.scale.set(scale);
            starfield.x = -cam.x * parallax + (pixiApp.screen.width * (1 - scale)) / 2;
            starfield.y = -cam.y * parallax + (pixiApp.screen.height * (1 - scale)) / 2;

            const sParallax = 0.35;
            const sScale = 1 + (cam.scale.x - 1) * sParallax;
            shootingLayer.scale.set(sScale);
            shootingLayer.x = -cam.x * sParallax + (pixiApp.screen.width * (1 - sScale)) / 2;
            shootingLayer.y = -cam.y * sParallax + (pixiApp.screen.height * (1 - sScale)) / 2;
          }
        });

        // ---------- Draw on simulation tick ----------
        simulation.on("tick", () => {
          // 1) Nebulas (purple aura, stronger for higher degree)
          const pulse = 0.85 + 0.15 * (0.5 + 0.5 * Math.sin(tSec * 0.8)); // gentle 0.85..1.0
          nebulas.clear();
          for (const n of nodes) {
            const d = degree.get(n.id) || 0;
            if (d <= 0) continue;

            // base radius from degree + popularity
            const base =
              25 +
              d * 6 +
              Math.max(0, (n.popularity ?? 50) - 50) * 0.25;

            // tiny wobble so it shimmers
            const wob = 2 * Math.sin((n.x + n.y + tSec * 20) * 0.002);

            const r = (base + wob) * (0.9 + 0.2 * pulse);

            // purple-ish 0x8b5cf6 with additive blending
            nebulas.beginFill(0x8b5cf6, Math.min(0.08 + d * 0.008, 0.25));
            nebulas.drawCircle(n.x, n.y, r);
            nebulas.endFill();
          }

          // 2) Links + nodes with wobble spin
          linksG.clear();

          const getDisplayPos = (c: any, node: ArtistNode) => {
            const wb = c.wobble as { phase: number; speed: number; radius: number };
            const dx = Math.cos(wb.speed * tSec + wb.phase) * wb.radius;
            const dy = Math.sin(wb.speed * tSec + wb.phase) * wb.radius;
            return { x: node.x + dx, y: node.y + dy };
          };

          const children = (nodesC as any).children;

          linksData.forEach((link: ArtistLink) => {
            const sNode = link.source as ArtistNode;
            const tNode = link.target as ArtistNode;
            const sc = children.find((child: any) => child?.d3Node?.id === sNode.id);
            const tc = children.find((child: any) => child?.d3Node?.id === tNode.id);
            if (sc && tc) {
              const sPos = getDisplayPos(sc, sNode);
              const tPos = getDisplayPos(tc, tNode);
              const alpha = link.similarity * 0.3 + 0.1;
              const width = link.similarity * 2 + 0.5;
              linksG.lineStyle(width, 0x63d4f1, alpha);
              linksG.moveTo(sPos.x, sPos.y);
              linksG.lineTo(tPos.x, tPos.y);
            }
          });

          nodes.forEach((n: ArtistNode) => {
            const c = children.find((child: any) => child?.d3Node?.id === n.id);
            if (!c) return;

            const pos = getDisplayPos(c, n);
            c.x = pos.x;
            c.y = pos.y;

            // rotate only the glow for a nebula swirl feel
            (c as any).glowSprite.x = pos.x;
            (c as any).glowSprite.y = pos.y;
            (c as any).glowSprite.rotation += ((c as any).glowSpin || 0.2) * 0.005;
          });
        });

        // initial center
        const cx = pixiApp.screen.width / 2;
        const cy = pixiApp.screen.height / 2;
        cameraContainer.x = cx;
        cameraContainer.y = cy;
        cameraContainer.pivot.set(cx, cy);

        setIsLoading(false);
      } catch (err) {
        console.error("Init failed:", err);
        setIsLoading(false);
      }
    };

    initialize();

    return () => {
      const app = pixiAppRef.current;
      if (app) {
        app.view.removeEventListener("wheel", handleWheel as any, false);
        app.stage.off("mousedown", startPan);
        app.stage.off("touchstart", startPan);
        app.stage.off("mousemove", onPan);
        app.stage.off("touchmove", onPan);
        app.stage.off("mouseup", stopPan);
        app.stage.off("touchend", stopPan);
        app.stage.off("mouseupoutside", stopPan);
        app.stage.off("touchendoutside", stopPan);
        app.destroy(true, { children: true, texture: true, baseTexture: true });
      }
    };
  }, [fetchGalaxyData]);

  /* ----- UI bits ----- */
  const Tooltip = () => {
    if (!tooltip) return null;
    return (
      <div
        style={{
          position: "absolute",
          top: tooltip.y,
          left: tooltip.x,
          zIndex: 100,
          backgroundColor: "rgba(30,41,59,0.8)",
          backdropFilter: "blur(8px)",
          padding: "12px 16px",
          borderRadius: 8,
          maxWidth: 250,
          pointerEvents: "none",
          border: "1px solid rgba(99,102,241,0.4)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          color: "#fff",
          fontFamily: "Inter, sans-serif",
          fontSize: 14,
        }}
      >
        <p style={{ margin: "0 0 6px 0", fontWeight: "bold", color: "#63d4f1", fontSize: 16 }}>{tooltip.name}</p>
        <p style={{ margin: 0, opacity: 0.8, fontSize: 12 }}>Genres:</p>
        <p style={{ margin: "4px 0 0 0", fontSize: 14, lineHeight: 1.4 }}>{tooltip.genres.join(", ")}</p>
      </div>
    );
  };

  const Legend = () => {
    const hexToCss = (hex: number) => "#" + hex.toString(16).padStart(6, "0").toUpperCase();
    const visibleGenres = Object.entries(genreColorMap).slice(0, 6);
    return (
      <div
        id="galaxy-legend"
        style={{
          position: "absolute",
          top: 80,
          right: 20,
          zIndex: 50,
          backgroundColor: "rgba(30,41,59,0.7)",
          backdropFilter: "blur(5px)",
          padding: 12,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
          color: "#fff",
          fontFamily: "Inter, sans-serif",
          fontSize: 11,
          width: 180,
        }}
      >
        <h3
          style={{
            margin: "0 0 8px 0",
            fontSize: 14,
            color: "#63d4f1",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            paddingBottom: 6,
          }}
        >
          Galaxy Key
        </h3>

        <div style={{ marginBottom: 8 }}>
          <p style={{ margin: "0 0 2px 0", fontWeight: "bold", fontSize: 12 }}>Star Size</p>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#fff", opacity: 0.6 }} />
            <span style={{ marginLeft: 6, opacity: 0.8 }}>Less Listened</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 2 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#fff" }} />
            <span style={{ marginLeft: 6, opacity: 0.9 }}>More Listened (Pop.)</span>
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <p style={{ margin: "0 0 2px 0", fontWeight: "bold", fontSize: 12 }}>Line Thickness</p>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 25, height: 1, backgroundColor: hexToCss(0x63d4f1), opacity: 0.2 }} />
            <span style={{ marginLeft: 6, opacity: 0.8 }}>Low Overlap</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 2 }}>
            <div style={{ width: 25, height: 2, backgroundColor: hexToCss(0x63d4f1) }} />
            <span style={{ marginLeft: 6, opacity: 0.9 }}>High Overlap (Sim.)</span>
          </div>
        </div>

        <div>
          <p style={{ margin: "0 0 4px 0", fontWeight: "bold", fontSize: 12 }}>Star Color (Genre)</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {visibleGenres.map(([genre, color]) => (
              <div key={genre} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: hexToCss(color) }} />
                <span style={{ marginLeft: 4, fontSize: 10 }}>{genre}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Navbar with left title / right buttons + safe-area padding
  const Navbar = () => (
    <div
      id="galaxy-navbar"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px calc(24px + env(safe-area-inset-right)) 10px calc(24px + env(safe-area-inset-left))",
        backgroundColor: "rgba(15,11,28,0.8)",
        backdropFilter: "blur(5px)",
        zIndex: 51,
        boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 700,
          color: "#fff",
          background: "linear-gradient(90deg,#63d4f1,#ffffff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontFamily: "Space Grotesk, sans-serif",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "60vw",
        }}
      >
        {isGroup ? `Merged Galaxy ${code}` : `${USERNAME}'s Galaxy`}
      </h1>

      <div style={{ display: "flex", gap: 12, whiteSpace: "nowrap" }}>
        <button
          onClick={saveScreenshot}
          style={{
            padding: "8px 12px",
            backgroundColor: "rgba(255,255,255,0.1)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          📷 Save
        </button>
        <button
          onClick={() => setMergeModalVisible(true)}
          style={{
            padding: "8px 12px",
            backgroundColor: "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 0 5px rgba(99,102,241,0.5)",
          }}
        >
          ✨ Merge
        </button>
      </div>
    </div>
  );

  type MergeModalProps = { visible: boolean; onClose: () => void };

  function MergeModal({ visible, onClose }: MergeModalProps) {
    const [mergeCode, setMergeCode] = useState("");
    const [copied, setCopied] = useState(false);
    if (!visible) return null;

    const handleCopy = () => {
      const el = document.createElement("textarea");
      el.value = MOCK_USER_ID;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 150,
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(30,41,59,0.95)",
            padding: 30,
            borderRadius: 16,
            maxWidth: 450,
            width: "90%",
            boxShadow: "0 0 30px rgba(99,102,241,0.5)",
            border: "1px solid rgba(99,102,241,0.2)",
            color: "#fff",
            fontFamily: "Inter, sans-serif",
            textAlign: "center",
          }}
        >
          <h3 style={{ fontSize: 24, margin: "0 0 10px 0", color: "#63d4f1" }}>Friend Universe Merge</h3>
          <p style={{ margin: "0 0 20px 0", opacity: 0.8 }}>Combine your galaxy with a friend&#39;s!</p>

          <div style={{ marginBottom: 25, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <p style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>Share Your Universe Code:</p>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
              <input
                readOnly
                value={MOCK_USER_ID}
                style={{
                  flexGrow: 1,
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid #6366f1",
                  backgroundColor: "#1e293b",
                  color: "#fff",
                  fontFamily: "Inter, monospace",
                  textAlign: "center",
                }}
              />
              <button
                onClick={handleCopy}
                style={{
                  padding: "10px 15px",
                  backgroundColor: copied ? "#10b981" : "#6366f1",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                }}
              >
                {copied ? "Copied! ✅" : "⎘ Copy"}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>Join a Friend&#39;s Universe:</p>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                placeholder="Enter friend&#39;s code..."
                value={mergeCode}
                onChange={(e) => setMergeCode(e.target.value)}
                style={{
                  flexGrow: 1,
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid #1e293b",
                  backgroundColor: "#0B0F14",
                  color: "#fff",
                  fontFamily: "Inter, monospace",
                }}
              />
              <button
                onClick={() => { console.log(`Attempting to merge with code: ${mergeCode}`); }}
                disabled={mergeCode.length < 5}
                style={{
                  padding: "10px 15px",
                  backgroundColor: mergeCode.length >= 5 ? "#a855f7" : "#374151",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: mergeCode.length >= 5 ? "pointer" : "default",
                }}
              >
                Join 🚀
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              backgroundColor: "transparent",
              color: "#ddd",
              border: "1px solid #444",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            ⎋ Back to Solo Galaxy
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        body { margin: 0; padding: 0; overflow: hidden; font-family: 'Inter', system-ui, sans-serif; }
      `}</style>
      <main style={{ minHeight: "100vh", backgroundColor: "#0F0B1C", position: "relative", touchAction: "none" }}>
        {isLoading && (
          <div
            style={{
              display: "grid",
              placeItems: "center",
              height: "100vh",
              color: "#63d4f1",
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 24,
            }}
          >
            {isGroup ? `Assembling merged galaxy ${code}…` : "Launching your personal universe…"}
          </div>
        )}
        <div ref={pixiContainerRef} style={{ width: "100vw", height: "100vh" }} />

        {/* Subtle vignette overlay */}
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)",
            zIndex: 20,
          }}
        />

        <Navbar />
        <Tooltip />
        <Legend />
        <MergeModal visible={mergeModalVisible} onClose={() => setMergeModalVisible(false)} />
      </main>
    </>
  );
}
