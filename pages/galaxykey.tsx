// components/GalaxyKey.tsx
import React from "react";

type GenreKey = { name: string; color: string };

export type GalaxyKeyProps = {
  /** Provide a custom genre → color list. Defaults to a comprehensive set. */
  genres?: GenreKey[];
  /** Optional className to position the card in your layout. */
  className?: string;
  /** Max height (px) for the genre list before it scrolls. */
  maxListHeight?: number;
};

const DEFAULT_GENRES: GenreKey[] = [
  { name: "Pop", color: "#ff6584" },
  { name: "Rock", color: "#f97316" },
  { name: "Hard Rock", color: "#ef4444" },
  { name: "Pop Punk", color: "#fb923c" },
  { name: "Indie", color: "#22d3ee" },
  { name: "Alternative", color: "#34d399" },
  { name: "Hip-Hop", color: "#ffd166" },
  { name: "Trap", color: "#22d3ee" },
  { name: "R&B", color: "#f472b6" },
  { name: "Soul", color: "#f59e0b" },
  { name: "Funk", color: "#f43f5e" },
  { name: "Electronic", color: "#00e5ff" },
  { name: "EDM", color: "#06b6d4" },
  { name: "House", color: "#22c55e" },
  { name: "Techno", color: "#0ea5e9" },
  { name: "Trance", color: "#38bdf8" },
  { name: "Drum & Bass", color: "#0891b2" },
  { name: "Dubstep", color: "#7c3aed" },
  { name: "Electro", color: "#67e8f9" },
  { name: "Synthwave", color: "#e879f9" },
  { name: "Vaporwave", color: "#a3e635" },
  { name: "Chillout", color: "#99f6e4" },
  { name: "Ambient", color: "#a7f3d0" },
  { name: "Lo-fi", color: "#c4b5fd" },
  { name: "Classical", color: "#e5e7eb" },
  { name: "Opera", color: "#f3f4f6" },
  { name: "Soundtrack", color: "#fde68a" },
  { name: "Jazz", color: "#a78bfa" },
  { name: "Blues", color: "#60a5fa" },
  { name: "Country", color: "#f4a261" },
  { name: "Folk", color: "#b8f7d4" },
  { name: "Reggae", color: "#10b981" },
  { name: "Dancehall", color: "#f59e0b" },
  { name: "Reggaeton", color: "#f43f5e" },
  { name: "Latin", color: "#ef4444" },
  { name: "Afrobeat", color: "#84cc16" },
  { name: "World", color: "#14b8a6" },
  { name: "Metal", color: "#9aa7b2" },
  { name: "Metalcore", color: "#9ca3af" },
  { name: "Punk", color: "#f97316" },
  { name: "Grime", color: "#374151" },
  { name: "Industrial", color: "#6b7280" },
  { name: "Post-Rock", color: "#93c5fd" },
  { name: "Progressive Rock", color: "#4ade80" },
  { name: "Progressive House", color: "#2dd4bf" },
  { name: "Disco", color: "#f9a8d4" },
  { name: "Gospel", color: "#fde047" },
  { name: "Ska", color: "#d1d5db" },
  { name: "Singer-Songwriter", color: "#eab308" },
  { name: "K-Pop", color: "#ec4899" },
  { name: "J-Pop", color: "#fb7185" },
];

export default function GalaxyKey({
  genres = DEFAULT_GENRES,
  className,
  maxListHeight = 240,
}: GalaxyKeyProps) {
  return (
    <aside className={`galaxy-key ${className ?? ""}`} aria-labelledby="galaxy-key-title">
      <header className="gk-header">
        <div className="gk-title-row">
          <h3 id="galaxy-key-title" className="gk-title">
            Galaxy Key
          </h3>
          <span className="gk-pill" aria-hidden>
            Legend
          </span>
        </div>
        <p className="gk-subtitle">How to read the galaxy map</p>
      </header>

      <section className="gk-section" aria-label="Star size legend">
        <h4 className="gk-section-title">Star Size</h4>
        <div className="gk-row">
          <Dot size={8} color="rgba(255,255,255,.6)" />
          <span className="gk-label">Less Listened</span>
        </div>
        <div className="gk-row">
          <Dot size={14} color="#ffffff" glow="0 0 10px rgba(255,255,255,.6)" />
          <span className="gk-label">More Listened (Popularity)</span>
        </div>
      </section>

      <section className="gk-section" aria-label="Line thickness legend">
        <h4 className="gk-section-title">Line Thickness</h4>
        <div className="gk-row">
          <LineSample thickness={2} opacity={0.5} />
          <span className="gk-label">Low Overlap / Similarity</span>
        </div>
        <div className="gk-row">
          <LineSample thickness={6} opacity={0.9} />
          <span className="gk-label">High Overlap / Similarity</span>
        </div>
      </section>

      <section className="gk-section" aria-label="Star colors by genre">
        <div className="gk-section-title-row">
          <h4 className="gk-section-title">Star Color (Genre)</h4>
          <span className="gk-count">{genres.length}</span>
        </div>
        <div
          className="gk-genre-grid"
          style={{ maxHeight: maxListHeight, overflowY: "auto" }}
          role="list"
        >
          {genres.map((g) => (
            <div className="gk-genre" key={g.name} role="listitem" title={g.name}>
              <Dot size={10} color={g.color} glow={`0 0 8px ${withAlpha(g.color, 0.65)}`} />
              <span className="gk-genre-name">{g.name}</span>
            </div>
          ))}
        </div>
      </section>

      <style jsx>{`
        .galaxy-key {
          --bg: rgba(255, 255, 255, 0.06);
          --border: rgba(255, 255, 255, 0.1);
          --text: rgba(255, 255, 255, 0.92);
          --muted: rgba(255, 255, 255, 0.6);
          --accent: #63d4f1;
          --shadow: 0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06);
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--shadow);
          padding: 16px 16px 14px;
          width: 280px;
          color: var(--text);
          backdrop-filter: blur(8px);
        }

        .gk-header {
          margin-bottom: 12px;
        }

        .gk-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .gk-title {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 0.2px;
          background: linear-gradient(90deg, #ffffff, var(--accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .gk-pill {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid var(--border);
          color: var(--muted);
          background: rgba(255, 255, 255, 0.04);
        }

        .gk-subtitle {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: var(--muted);
        }

        .gk-section {
          padding-top: 10px;
          border-top: 1px dashed var(--border);
        }

        .gk-section:first-of-type {
          padding-top: 0;
          border-top: 0;
        }

        .gk-section + .gk-section {
          margin-top: 10px;
        }

        .gk-section-title {
          margin: 0 0 8px 0;
          font-size: 12px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          color: var(--muted);
        }

        .gk-section-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .gk-count {
          font-size: 10px;
          color: var(--muted);
          padding: 2px 6px;
          border-radius: 999px;
          border: 1px solid var(--border);
        }

        .gk-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 6px 0;
        }

        .gk-label {
          font-size: 13px;
        }

        .gk-genre-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px 12px;
          padding-right: 6px; /* room for scrollbar */
        }

        .gk-genre {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .gk-genre-name {
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Subtle scrollbar styling (Webkit) */
        .gk-genre-grid::-webkit-scrollbar {
          width: 8px;
        }
        .gk-genre-grid::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 8px;
        }
        .gk-genre-grid::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </aside>
  );
}

function Dot({
  size,
  color,
  glow,
}: {
  size: number;
  color: string;
  glow?: string;
}) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: 999,
        background: color,
        boxShadow: glow,
        flex: "0 0 auto",
      }}
    />
  );
}

function LineSample({
  thickness,
  opacity = 1,
}: {
  thickness: number;
  opacity?: number;
}) {
  const grad =
    "linear-gradient(90deg, rgba(99,212,241,0.0) 0%, rgba(99,212,241,1) 20%, rgba(99,212,241,1) 80%, rgba(99,212,241,0.0) 100%)";
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        height: thickness,
        width: 72,
        background: grad,
        opacity,
        borderRadius: 999,
        boxShadow: "0 0 8px rgba(99,212,241,.35)",
        flex: "0 0 auto",
      }}
    />
  );
}

/** Utility: add alpha to a hex or rgb(a) color best-effort. */
function withAlpha(color: string, a: number): string {
  if (color.startsWith("#")) {
    // Expand short hex
    const hex = color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${a})`);
  }
  if (color.startsWith("rgba(")) {
    return color.replace(/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/, (_, r, g, b) => `rgba(${r},${g},${b},${a})`);
  }
  return color;
}
