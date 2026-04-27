"use client";

// ─── NexoraDiagram ────────────────────────────────────────────────────────
// Architectural visualization of Nexora as a single operating layer that
// connects catalog, storefront, checkout, ads, logistics and AI on top of
// one shared dataset. Replaces the dashboard mockup that used to be the
// home's right-rail anchor — that piece read as "fake screenshot of an
// admin", which is exactly the SaaS-template signal we want to drop.
//
// Hand-drawn in pure SVG so it renders crisp at any size and inherits the
// brand tokens directly. No images, no third-party libs.
import { type SVGProps } from "react";

const TOKENS = {
  bg: "var(--surface-paper)",
  hairline: "var(--hairline)",
  hairlineStrong: "var(--hairline-strong)",
  brand: "var(--brand)",
  ink: "var(--ink-0)",
  ink5: "var(--ink-5)",
  ink6: "var(--ink-6)",
  accent: "var(--accent-500)",
} as const;

// Six modules orbit the central "Nexora core". Layout is hand-tuned so
// the diagram reads as left-to-right flow (data sources → Nexora → outputs).
const NODES = [
  { id: "catalog",   label: "Catálogo",     x:  72, y:  90 },
  { id: "stock",     label: "Stock",        x:  72, y: 210 },
  { id: "supplier",  label: "Proveedores",  x:  72, y: 330 },
  { id: "store",     label: "Storefront",   x: 528, y:  90 },
  { id: "checkout",  label: "Checkout",     x: 528, y: 210 },
  { id: "ads",       label: "Ads",          x: 528, y: 330 },
] as const;

const CORE = { x: 300, y: 210 };

function Edge({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  // Quadratic curve so connections curve through the diagram instead of
  // forming a flat star. The control point is the horizontal midpoint
  // pulled toward the source row — gives the impression of "data flowing
  // through" the core rather than radiating from it.
  const cx = (from.x + to.x) / 2;
  const cy = from.y;
  return (
    <path
      d={`M ${from.x} ${from.y} Q ${cx} ${cy}, ${to.x} ${to.y}`}
      stroke={TOKENS.hairline}
      strokeWidth={1.25}
      fill="none"
    />
  );
}

function ModuleNode({
  x,
  y,
  label,
  align,
}: {
  x: number;
  y: number;
  label: string;
  align: "left" | "right";
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={6} fill={TOKENS.bg} stroke={TOKENS.hairlineStrong} strokeWidth={1.25} />
      <circle cx={x} cy={y} r={2} fill={TOKENS.brand} />
      <text
        x={align === "left" ? x - 14 : x + 14}
        y={y + 4}
        fontFamily="var(--font-sans)"
        fontSize={12}
        fontWeight={500}
        fill={TOKENS.ink}
        textAnchor={align === "left" ? "end" : "start"}
      >
        {label}
      </text>
    </g>
  );
}

export function NexoraDiagram(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 600 420"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Diagrama: Nexora conecta catálogo, stock y proveedores con storefront, checkout y ads sobre un mismo núcleo."
      {...props}
    >
      <defs>
        {/* Hairline grid backdrop so the diagram reads as architectural,
            not decorative. Same 32px rhythm as .canvas-grid. */}
        <pattern id="nx-grid" width={32} height={32} patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke={TOKENS.hairline} strokeWidth={1} />
        </pattern>
        <radialGradient id="nx-core" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={TOKENS.brand} />
          <stop offset="100%" stopColor="#0a0c2c" />
        </radialGradient>
      </defs>

      {/* Backdrop */}
      <rect x={0} y={0} width={600} height={420} fill={TOKENS.bg} />
      <rect x={0} y={0} width={600} height={420} fill="url(#nx-grid)" opacity={0.6} />

      {/* Edges first so nodes paint over them */}
      {NODES.map((n) => (
        <Edge key={n.id} from={{ x: n.x, y: n.y }} to={CORE} />
      ))}

      {/* Core (Nexora). A navy disk + label inside. */}
      <circle cx={CORE.x} cy={CORE.y} r={64} fill="url(#nx-core)" />
      <circle cx={CORE.x} cy={CORE.y} r={64} fill="none" stroke={TOKENS.brand} strokeWidth={1.5} opacity={0.6} />
      <text
        x={CORE.x}
        y={CORE.y - 4}
        fontFamily="var(--font-display)"
        fontSize={14}
        fontWeight={600}
        letterSpacing="0.18em"
        textAnchor="middle"
        fill="rgba(255,255,255,0.55)"
      >
        NEXORA
      </text>
      <text
        x={CORE.x}
        y={CORE.y + 16}
        fontFamily="var(--font-sans)"
        fontSize={11}
        fontWeight={500}
        textAnchor="middle"
        fill="rgba(255,255,255,0.75)"
      >
        Núcleo operativo
      </text>

      {/* Modules */}
      {NODES.map((n) => (
        <ModuleNode key={n.id} x={n.x} y={n.y} label={n.label} align={n.x < CORE.x ? "left" : "right"} />
      ))}

      {/* Bottom layer: a single line that reads as "real data" on which
          everything sits. Subtitle anchors the metaphor. */}
      <line x1={48} y1={384} x2={552} y2={384} stroke={TOKENS.hairline} strokeWidth={1} />
      <text
        x={CORE.x}
        y={400}
        fontFamily="var(--font-sans)"
        fontSize={10.5}
        letterSpacing="0.18em"
        textAnchor="middle"
        fill={TOKENS.ink5}
      >
        UNA SOLA BASE DE DATOS · CATÁLOGO · STOCK · CLIENTES
      </text>
    </svg>
  );
}
