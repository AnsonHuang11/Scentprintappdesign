import { useEffect, useRef } from 'react';

// ══════════════════════════════════════════════════════════════════════════════
// ScentSphere — THE canonical scent visualization used across the entire app.
// A structured breathing density sphere: dark nucleus → warm mid field →
// soft outer diffusion halo. 4-second breathing cycle. Asymmetric core offset.
// Used by: CaptureScreen (via CaptureMist wrapper), Archive, Map, Share.
// ══════════════════════════════════════════════════════════════════════════════

// 7 warm-neutral palettes — core is darkest, outer is lightest.
// Contrast between core and outer is intentionally higher than previous system.
const SPHERE_PALETTES = [
  { core: [55, 32, 12],  mid: [128, 84, 42],  outer: [186, 152, 108] }, // 0 amber/copper
  { core: [32, 58, 32],  mid: [80, 120, 72],  outer: [150, 178, 140] }, // 1 cedar/sage
  { core: [58, 50, 38],  mid: [114, 100, 80], outer: [172, 160, 142] }, // 2 salt/stone
  { core: [70, 30, 14],  mid: [142, 74, 36],  outer: [196, 144, 100] }, // 3 spice/terra
  { core: [42, 46, 72],  mid: [88, 92, 136],  outer: [152, 155, 192] }, // 4 slate/dusk
  { core: [54, 36, 18],  mid: [110, 78, 46],  outer: [168, 138, 106] }, // 5 tobacco/umber
  { core: [32, 56, 30],  mid: [76, 116, 66],  outer: [144, 172, 134] }, // 6 moss/herb
] as const;

export interface ScentSphereProps {
  isDark?: boolean;
  colorSeed?: number;
  /** Radius multiplier — used by CaptureMist to grow sphere during sampling */
  amplify?: number;
  /** Sphere base radius as fraction of min(W, H). Default 0.40. */
  sphereRatio?: number;
  /** Vertical centre of sphere as fraction of H. Default 0.50. */
  relativeCY?: number;
  className?: string;
}

export function ScentSphere({
  isDark = false,
  colorSeed = 0,
  amplify = 1.0,
  sphereRatio = 0.40,
  relativeCY = 0.50,
  className = '',
}: ScentSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const ampRef    = useRef(amplify);

  // Sync amplify ref without restarting the draw loop
  useEffect(() => { ampRef.current = amplify; }, [amplify]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pal = SPHERE_PALETTES[colorSeed % SPHERE_PALETTES.length];
    const [cr, cg, cb] = pal.core;
    const [mr, mg, mb] = pal.mid;
    const [or, og, ob] = pal.outer;
    const bgColor = isDark ? '#0E0F12' : '#F4F2EF';

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    const draw = (t: number) => {
      const W  = canvas.offsetWidth;
      const H  = canvas.offsetHeight;
      const A  = ampRef.current;
      const d  = Math.min(W, H);
      const cx = W * 0.5;
      const cy = H * relativeCY;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, H);

      // ── Oscillators ────────────────────────────────────────────────────────
      // breathe  : 4 s primary cycle — drives core & mid contraction/expansion
      // halobr   : same 4 s period, 90° ahead — halo expands as core contracts
      // drift    : 11 s ultra-slow — keeps the sphere feeling subtly alive
      const breathe = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / 4000);
      const halobr  = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / 4000 + Math.PI * 0.5);
      const drift   = Math.sin(t * Math.PI * 2 / 11000);

      // ── Sphere radius ───────────────────────────────────────────────────────
      // amplify grows R for the Capture sampling animation, capped at 1.5×
      const baseR = d * Math.min(sphereRatio * (1 + (A - 1) * 0.35), sphereRatio * 1.5);
      // breathe adds ±3% pulse to the visible outer boundary
      const R     = baseR * (0.97 + breathe * 0.03);

      // ── Core asymmetry: 5% offset so it never looks perfectly centred ───────
      const coreX = cx + R * 0.048 + drift * R * 0.010;
      const coreY = cy - R * 0.022 + drift * R * 0.006;

      // ── LAYER 0: Outer atmospheric halo (drawn before the clip) ─────────────
      // Expands from R*1.02 to R*1.20 on halobr — clearly noticeable retraction.
      // Annular inner edge at R*0.70 so it does not compete with sphere interior.
      {
        const haloR = R * (1.02 + halobr * 0.18);
        const hOp   = (0.048 + halobr * 0.038) * Math.min(A, 1.3);
        const hg    = ctx.createRadialGradient(cx, cy, R * 0.70, cx, cy, haloR);
        hg.addColorStop(0,    `rgba(${or},${og},${ob},${hOp})`);
        hg.addColorStop(0.44, `rgba(${or},${og},${ob},${hOp * 0.40})`);
        hg.addColorStop(1,    `rgba(${or},${og},${ob},0)`);
        ctx.fillStyle = hg;
        ctx.fillRect(0, 0, W, H);
      }

      // ── SPHERE CLIP ─────────────────────────────────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      // LAYER A — Full base body: 7 stops, dark nucleus → warm mid → soft rim.
      // Sets the primary colour gradient. Provides baseline opacity floor for
      // all other layers to stack on top of.
      {
        const baseOp = isDark ? 0.82 : 0.74;
        const g      = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        g.addColorStop(0,    `rgba(${cr},${cg},${cb},${baseOp * A})`);
        g.addColorStop(0.14, `rgba(${cr},${cg},${cb},${baseOp * 0.90 * A})`);
        g.addColorStop(0.30, `rgba(${mr},${mg},${mb},${0.66 * A})`);
        g.addColorStop(0.50, `rgba(${mr},${mg},${mb},${0.42 * A})`);
        g.addColorStop(0.68, `rgba(${or},${og},${ob},${0.22 * A})`);
        g.addColorStop(0.84, `rgba(${or},${og},${ob},${0.07 * A})`);
        g.addColorStop(1,    `rgba(${or},${og},${ob},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      // LAYER B — Mid breathing zone (~0.52–0.62 R).
      // Radius and density both increase on breathe → clear visible pulsation.
      {
        const R_b = R * (0.52 + breathe * 0.10);
        const bOp = 0.22 + breathe * 0.16; // 0.22 → 0.38 — clearly noticeable
        const g2  = ctx.createRadialGradient(cx, cy, 0, cx, cy, R_b);
        g2.addColorStop(0,    `rgba(${cr},${cg},${cb},${bOp * A})`);
        g2.addColorStop(0.26, `rgba(${mr},${mg},${mb},${bOp * 0.68 * A})`);
        g2.addColorStop(0.60, `rgba(${mr},${mg},${mb},${bOp * 0.24 * A})`);
        g2.addColorStop(1,    `rgba(${mr},${mg},${mb},0)`);
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, W, H);
      }

      // LAYER C — Inner density zone (~0.28–0.36 R). Counter-phase to Layer B.
      // When B expands and brightens, C contracts and dims — this anti-sync is
      // what creates the layered concentric depth illusion (not visible rings).
      {
        const R_c = R * (0.28 + (1 - breathe) * 0.08); // contracts while B expands
        const cOp = 0.18 + (1 - breathe) * 0.14;        // dims while B brightens
        const g3  = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, R_c);
        g3.addColorStop(0,    `rgba(${cr},${cg},${cb},${cOp * A})`);
        g3.addColorStop(0.32, `rgba(${cr},${cg},${cb},${cOp * 0.58 * A})`);
        g3.addColorStop(0.70, `rgba(${mr},${mg},${mb},${cOp * 0.18 * A})`);
        g3.addColorStop(1,    `rgba(${mr},${mg},${mb},0)`);
        ctx.fillStyle = g3;
        ctx.fillRect(0, 0, W, H);
      }

      // LAYER D — Nucleus (~0.18–0.22 R). Darkest, most defined zone.
      // Anchored at the asymmetric core offset. Opacity pulses on breathe
      // for a clear, calm contraction/expansion that reads as "alive."
      {
        const R_d = R * (0.18 + breathe * 0.04); // 0.18 R → 0.22 R
        const dOp = (isDark ? 0.80 : 0.72) + breathe * 0.14; // clear opacity pulse
        const g4  = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, R_d);
        g4.addColorStop(0,    `rgba(${cr},${cg},${cb},${dOp * A})`);
        g4.addColorStop(0.25, `rgba(${cr},${cg},${cb},${dOp * 0.74 * A})`);
        g4.addColorStop(0.56, `rgba(${cr},${cg},${cb},${dOp * 0.28 * A})`);
        g4.addColorStop(1,    `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = g4;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.restore(); // ── end sphere clip ────────────────────────────────────

      // ── EDGE LIMB ───────────────────────────────────────────────────────────
      // Thin warm annular ring at the sphere boundary — clean separation from
      // background without a hard edge. Drawn outside the clip.
      {
        const eg = ctx.createRadialGradient(cx, cy, R * 0.88, cx, cy, R * 1.05);
        eg.addColorStop(0,   `rgba(${or},${og},${ob},${0.13 * Math.min(A, 1.2)})`);
        eg.addColorStop(0.6, `rgba(${or},${og},${ob},${0.04 * Math.min(A, 1.2)})`);
        eg.addColorStop(1,   `rgba(${or},${og},${ob},0)`);
        ctx.fillStyle = eg;
        ctx.fillRect(0, 0, W, H);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [isDark, colorSeed, sphereRatio, relativeCY]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ display: 'block' }}
    />
  );
}

// ── Legacy exports — kept for any remaining internal use ──────────────────────

// Color palettes — core / mid / outer per scent signature
const MIST_PALETTES_DARK = [
  { core: [240, 180, 100], mid: [193, 122, 58], outer: [160, 90, 30] },   // amber/copper
  { core: [180, 220, 200], mid: [100, 160, 140], outer: [60, 120, 100] },  // celadon/cedar
  { core: [220, 190, 160], mid: [170, 130, 90], outer: [130, 90, 55] },    // warm sand/salt
  { core: [240, 160, 120], mid: [200, 110, 70], outer: [160, 75, 45] },    // spice/cumin
  { core: [200, 200, 240], mid: [130, 130, 200], outer: [80, 80, 160] },   // birch/cool
  { core: [220, 200, 170], mid: [175, 145, 110], outer: [140, 110, 80] },  // bread/warm
  { core: [200, 180, 230], mid: [150, 120, 190], outer: [110, 80, 150] },  // lavender
];

const MIST_PALETTES_LIGHT = [
  { core: [200, 140, 60], mid: [168, 104, 40], outer: [140, 80, 25] },
  { core: [80, 140, 120], mid: [60, 110, 95], outer: [40, 80, 65] },
  { core: [170, 130, 90], mid: [140, 100, 60], outer: [110, 75, 40] },
  { core: [200, 100, 60], mid: [170, 75, 40], outer: [140, 55, 28] },
  { core: [100, 110, 180], mid: [80, 90, 155], outer: [60, 70, 130] },
  { core: [180, 150, 100], mid: [155, 120, 70], outer: [130, 100, 50] },
  { core: [140, 100, 175], mid: [115, 78, 150], outer: [90, 58, 125] },
];

// Draw a soft ellipse-clipped radial gradient — core primitive for asymmetry
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawEllipseLayer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  x: number, y: number,
  rx: number, ry: number,
  rotation: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  grad: any,
  w: number, h: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(1, rx), Math.max(1, ry), rotation, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function MistVisualization({
  isDark,
  intensity = 75,
  size = 'full',
  colorSeed = 0,
  className = '',
}: MistVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const palette = isDark
      ? MIST_PALETTES_DARK[colorSeed % MIST_PALETTES_DARK.length]
      : MIST_PALETTES_LIGHT[colorSeed % MIST_PALETTES_LIGHT.length];

    const bgColor = isDark ? '#0E0F12' : '#F4F2EF';
    const iScale = intensity / 100;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    const draw = (timestamp: number) => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const cx = w / 2;
      const cy = size === 'full' ? h * 0.46 : h / 2;

      // Breathing: 4.5s cycle
      const phase = (timestamp % 4500) / 4500;
      const breath = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
      // Secondary slow drift — used for asymmetric offset
      const drift  = Math.sin((timestamp % 7000) / 7000 * Math.PI * 2);
      const drift2 = Math.cos((timestamp % 9200) / 9200 * Math.PI * 2);

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);

      const minDim = Math.min(w, h);
      const [or, og, ob] = palette.outer;
      const [mr, mg, mb] = palette.mid;
      const [cr, cg, cb] = palette.core;

      // ── 1. Outer atmospheric haze — reduced to ~half previous opacity ──────
      // Ellipse: wider than tall, slow clockwise drift in rotation
      {
        const outerR = minDim * (0.50 + breath * 0.06) * iScale + minDim * 0.14;
        const outerX = cx + drift  * minDim * 0.025;
        const outerY = cy + drift2 * minDim * 0.015;
        const outerRot = drift * 0.38;
        const rx = outerR * 1.14;
        const ry = outerR * 0.87;

        const outerGrad = ctx.createRadialGradient(outerX, outerY, 0, outerX, outerY, outerR);
        outerGrad.addColorStop(0,    `rgba(${or},${og},${ob},${(0.048 + breath * 0.022) * iScale})`);
        outerGrad.addColorStop(0.32, `rgba(${or},${og},${ob},${(0.028 + breath * 0.012) * iScale})`);
        outerGrad.addColorStop(0.68, `rgba(${or},${og},${ob},${0.010 * iScale})`);
        outerGrad.addColorStop(1,    `rgba(${or},${og},${ob},0)`);

        drawEllipseLayer(ctx, outerX, outerY, rx, ry, outerRot, outerGrad, w, h);
      }

      // ── 2. Mid diffusion — slightly tighter, counter-drifting ─────────────
      {
        const midR = minDim * (0.31 + breath * 0.045) * iScale + minDim * 0.07;
        const midX = cx - drift  * minDim * 0.018 + drift2 * minDim * 0.010;
        const midY = cy - drift2 * minDim * 0.014;
        const midRot = -drift * 0.28 + drift2 * 0.12;
        const rx = midR * 0.96;
        const ry = midR * 1.09;

        const midGrad = ctx.createRadialGradient(midX, midY, 0, midX, midY, midR);
        midGrad.addColorStop(0,    `rgba(${mr},${mg},${mb},${(0.13 + breath * 0.055) * iScale})`);
        midGrad.addColorStop(0.38, `rgba(${mr},${mg},${mb},${(0.070 + breath * 0.030) * iScale})`);
        midGrad.addColorStop(0.72, `rgba(${mr},${mg},${mb},${0.018 * iScale})`);
        midGrad.addColorStop(1,    `rgba(${mr},${mg},${mb},0)`);

        drawEllipseLayer(ctx, midX, midY, rx, ry, midRot, midGrad, w, h);
      }

      // ── 3. Inner warm zone — new transitional layer, slightly asymmetric ──
      {
        const innerR = minDim * (0.20 + breath * 0.03) * iScale + minDim * 0.05;
        const innerX = cx + drift  * minDim * 0.012;
        const innerY = cy + drift2 * minDim * 0.010;
        const innerRot = drift * 0.20;
        const rx = innerR * 1.06;
        const ry = innerR * 0.95;

        const innerGrad = ctx.createRadialGradient(innerX, innerY, 0, innerX, innerY, innerR);
        innerGrad.addColorStop(0,    `rgba(${mr},${mg},${mb},${(0.22 + breath * 0.10) * iScale})`);
        innerGrad.addColorStop(0.45, `rgba(${mr},${mg},${mb},${(0.10 + breath * 0.04) * iScale})`);
        innerGrad.addColorStop(0.80, `rgba(${mr},${mg},${mb},${0.022 * iScale})`);
        innerGrad.addColorStop(1,    `rgba(${mr},${mg},${mb},0)`);

        drawEllipseLayer(ctx, innerX, innerY, rx, ry, innerRot, innerGrad, w, h);
      }

      // ── 4. Core — significantly boosted opacity (~50%+ stronger) ──────────
      {
        const coreR = minDim * (0.14 + breath * 0.032) * iScale + minDim * 0.038;
        const coreX = cx + drift  * minDim * 0.009;
        const coreY = cy + drift2 * minDim * 0.008;
        const coreRot = drift2 * 0.25;
        const rx = coreR * 1.08;
        const ry = coreR * 0.93;

        const coreOpacity = isDark
          ? (0.54 + breath * 0.24) * iScale  // was 0.35 + 0.18 → now ~+55%
          : (0.44 + breath * 0.18) * iScale; // was 0.28 + 0.13 → now ~+55%

        const coreGrad = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, coreR);
        coreGrad.addColorStop(0,    `rgba(${cr},${cg},${cb},${coreOpacity})`);
        coreGrad.addColorStop(0.28, `rgba(${cr},${cg},${cb},${coreOpacity * 0.72})`);
        coreGrad.addColorStop(0.58, `rgba(${cr},${cg},${cb},${coreOpacity * 0.28})`);
        coreGrad.addColorStop(0.82, `rgba(${cr},${cg},${cb},${coreOpacity * 0.06})`);
        coreGrad.addColorStop(1,    `rgba(${cr},${cg},${cb},0)`);

        drawEllipseLayer(ctx, coreX, coreY, rx, ry, coreRot, coreGrad, w, h);
      }

      // ── 5. Deep focus point — darker, blurred, creates spatial weight ─────
      // Slightly darkened palette hue + blur filter for soft inner-shadow feel
      {
        const dcr = Math.round(cr * 0.74);
        const dcg = Math.round(cg * 0.70);
        const dcb = Math.round(cb * 0.68);
        const deepR = minDim * (0.055 + breath * 0.012);
        const deepX = cx + drift  * minDim * 0.006;
        const deepY = cy + drift2 * minDim * 0.005;

        const deepOpacity = isDark
          ? (0.62 + breath * 0.28) * iScale
          : (0.50 + breath * 0.20) * iScale;

        // blur filter makes the circle spread softly, simulating depth weight
        ctx.save();
        ctx.filter = `blur(${Math.round(minDim * 0.018)}px)`;
        const deepGrad = ctx.createRadialGradient(deepX, deepY, 0, deepX, deepY, deepR);
        deepGrad.addColorStop(0,    `rgba(${dcr},${dcg},${dcb},${deepOpacity})`);
        deepGrad.addColorStop(0.55, `rgba(${dcr},${dcg},${dcb},${deepOpacity * 0.40})`);
        deepGrad.addColorStop(1,    `rgba(${dcr},${dcg},${dcb},0)`);
        ctx.fillStyle = deepGrad;
        ctx.beginPath();
        ctx.arc(deepX, deepY, deepR * 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.filter = 'none';
        ctx.restore();
      }

      // ── 6. Soft depth shadow ring around core edge (depth illusion) ───────
      // A very subtle darker annular fade just outside the core gives spatial weight
      {
        const shadowR = minDim * (0.12 + breath * 0.020) * iScale + minDim * 0.028;
        const shadowX = cx + drift * minDim * 0.008;
        const shadowY = cy;

        const dcr = Math.round(cr * 0.60);
        const dcg = Math.round(cg * 0.55);
        const dcb = Math.round(cb * 0.52);
        const shadowAlpha = isDark
          ? (0.12 + breath * 0.06) * iScale
          : (0.08 + breath * 0.04) * iScale;

        const shadowGrad = ctx.createRadialGradient(shadowX, shadowY, shadowR * 0.55, shadowX, shadowY, shadowR * 1.0);
        shadowGrad.addColorStop(0,   `rgba(${dcr},${dcg},${dcb},0)`);
        shadowGrad.addColorStop(0.5, `rgba(${dcr},${dcg},${dcb},${shadowAlpha})`);
        shadowGrad.addColorStop(1,   `rgba(${dcr},${dcg},${dcb},0)`);
        ctx.fillStyle = shadowGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // ── 7. Highlight brightspot — dark mode only ──────────────────────────
      if (isDark) {
        const hlR = minDim * (0.07 + breath * 0.018);
        const hlX = cx - minDim * 0.038 + drift  * minDim * 0.014;
        const hlY = cy - minDim * 0.054 + drift2 * minDim * 0.016;
        const hlGrad = ctx.createRadialGradient(hlX, hlY, 0, hlX, hlY, hlR);
        hlGrad.addColorStop(0, `rgba(${cr + 22},${cg + 18},${cb + 14},${(0.20 + breath * 0.14) * iScale})`);
        hlGrad.addColorStop(0.5, `rgba(${cr},${cg},${cb},${(0.06 + breath * 0.04) * iScale})`);
        hlGrad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = hlGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // ── 8. Micro particles (full size only) ──────────────────────────────
      if (size === 'full') {
        const pCount = 8;
        for (let i = 0; i < pCount; i++) {
          // Slightly varied orbit radii for organic spread
          const pAngle = (i / pCount) * Math.PI * 2 + phase * Math.PI * 0.25 + i * 0.38;
          const orbitX = 0.09 + (i % 3) * 0.048;
          const orbitY = orbitX * (0.58 + (i % 2) * 0.14); // elliptical orbit
          const px = cx + Math.cos(pAngle) * minDim * orbitX;
          const py = cy + Math.sin(pAngle) * minDim * orbitY;
          const pR  = (2.2 + (i % 4) * 0.9) * iScale;
          const pAlpha = (0.055 + breath * 0.045 + (i % 3) * 0.02) * iScale;

          const pGrad = ctx.createRadialGradient(px, py, 0, px, py, pR * 3.2);
          pGrad.addColorStop(0, `rgba(${cr},${cg},${cb},${pAlpha})`);
          pGrad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
          ctx.fillStyle = pGrad;
          ctx.beginPath();
          ctx.arc(px, py, pR * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [isDark, intensity, colorSeed, size]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ display: 'block' }}
    />
  );
}

// Static CSS-based thumbnail
export function MistThumbnail({
  isDark,
  colorSeed = 0,
  className = '',
}: {
  isDark: boolean;
  colorSeed?: number;
  className?: string;
}) {
  const THUMB_COLORS = isDark
    ? ['193,122,58', '100,160,140', '170,130,90', '200,110,70', '130,130,200', '175,145,110', '150,120,190']
    : ['168,104,40', '60,110,95', '140,100,60', '170,75,40', '80,90,155', '155,120,70', '115,78,150'];

  const THUMB_DEEP = isDark
    ? ['140,84,30', '65,110,90', '120,88,56', '148,72,40', '88,88,155', '130,104,72', '108,80,138']
    : ['138,88,28', '35,80,62', '98,68,36', '126,48,22', '52,62,118', '112,82,44', '80,50,112'];

  const c = THUMB_COLORS[colorSeed % THUMB_COLORS.length];
  const d = THUMB_DEEP[colorSeed % THUMB_DEEP.length];

  return (
    <div
      className={className}
      style={{
        background: isDark ? '#0E0F12' : '#F4F2EF',
        overflow: 'hidden',
      }}
    >
      {/* Outer haze — reduced opacity for depth separation */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 115% 88% at 52% 52%, rgba(${c},0.10) 0%, rgba(${c},0.05) 45%, transparent 72%)`,
          animation: 'sp-breathe 4.5s ease-in-out infinite',
        }}
      />
      {/* Mid warm zone */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 82% 94% at 48% 50%, rgba(${c},0.22) 0%, rgba(${c},0.10) 38%, transparent 65%)`,
          animation: 'sp-breathe 4.5s ease-in-out infinite 0.3s',
        }}
      />
      {/* Core — significantly boosted */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 55% 50% at 50% 48%, rgba(${c},0.72) 0%, rgba(${c},0.42) 28%, rgba(${c},0.12) 58%, transparent 80%)`,
          animation: 'sp-breathe 4.5s ease-in-out infinite 0.6s',
        }}
      />
      {/* Deep focus — darker, creates spatial weight */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 24% 22% at 50% 48%, rgba(${d},0.68) 0%, rgba(${d},0.28) 50%, transparent 80%)`,
          filter: 'blur(2px)',
          animation: 'sp-breathe 4.5s ease-in-out infinite 1s',
        }}
      />
    </div>
  );
}

// ── MeshThumbnail — canvas ribbon form matching the Capture Mist style ────────
// Unique to the Archive cards. Shares the same flowing bezier ribbon language
// as CaptureMist. Color-seeded per scent entry. No radial blobs.

// 7 warm-neutral ribbon palettes (low saturation, premium, calm)
const MESH_PALETTES = [
  { r: [188, 158, 115], d: [125, 90,  50], s: [228, 210, 182] }, // amber / sand
  { r: [152, 170, 145], d: [ 85, 118,  76], s: [208, 220, 202] }, // celadon / cedar
  { r: [174, 168, 154], d: [106, 100,  86], s: [220, 216, 206] }, // salt / stone
  { r: [198, 148, 104], d: [148,  84,  44], s: [232, 204, 172] }, // spice / terra
  { r: [158, 160, 180], d: [ 94,  94, 128], s: [210, 212, 228] }, // dusk / slate
  { r: [170, 136, 100], d: [ 98,  68,  40], s: [220, 204, 176] }, // tobacco / umber
  { r: [154, 168, 130], d: [ 84, 104,  60], s: [208, 218, 190] }, // sage / herb
];

export function MeshThumbnail({
  isDark,
  colorSeed = 0,
  className = '',
}: {
  isDark: boolean;
  colorSeed?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pal = MESH_PALETTES[colorSeed % MESH_PALETTES.length];
    const [rr, rg, rb] = pal.r;
    const [dr, dg, db] = pal.d;
    const [sr, sg, sb] = pal.s;
    const bg = isDark ? '#0E0F12' : '#F4F2EF';

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    // Bezier ribbon stroke helper — mirrors CaptureMist's ribbon()
    const ribbon = (
      x0: number, y0: number,
      c1x: number, c1y: number,
      c2x: number, c2y: number,
      x1: number, y1: number,
      width: number,
      grad: CanvasGradient | string,
      blur = 0,
    ) => {
      ctx.save();
      if (blur > 0) ctx.filter = `blur(${blur}px)`;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, x1, y1);
      ctx.strokeStyle = grad;
      ctx.lineWidth   = width;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.stroke();
      if (blur > 0) ctx.filter = 'none';
      ctx.restore();
    };

    const draw = (t: number) => {
      const W  = canvas.offsetWidth;
      const H  = canvas.offsetHeight;
      const cx = W * 0.50;
      const cy = H * 0.50;         // dead-centre for square thumbnail
      const d  = Math.min(W, H);

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Slow oscillators — same periods as CaptureMist for unified feel
      const b1 = Math.sin(t * (Math.PI * 2) / 5200);
      const b2 = Math.sin(t * (Math.PI * 2) / 6700 + 1.10);
      const b3 = Math.sin(t * (Math.PI * 2) / 4300 + 2.44);
      const b4 = Math.cos(t * (Math.PI * 2) / 7400 + 0.72);

      const px = (n: number) => cx + n * d;
      const py = (n: number) => cy + n * d;

      // ── RIBBON 1 — Main S-curve (lower-left → arch → lower-right) ─────
      {
        const x0  = px(-0.38 + b1 * 0.036);  const y0  = py( 0.22 + b2 * 0.026);
        const c1x = px(-0.08 + b3 * 0.054);  const c1y = py(-0.28 + b1 * 0.044);
        const c2x = px( 0.12 + b4 * 0.048);  const c2y = py(-0.18 + b2 * 0.036);
        const x1  = px( 0.37 + b3 * 0.028);  const y1  = py( 0.18 + b4 * 0.026);

        // Soft ambient halo
        const glo = ctx.createLinearGradient(x0, y0, x1, y1);
        glo.addColorStop(0,    `rgba(${rr},${rg},${rb},0)`);
        glo.addColorStop(0.35, `rgba(${rr},${rg},${rb},0.10)`);
        glo.addColorStop(0.62, `rgba(${rr},${rg},${rb},0.12)`);
        glo.addColorStop(1,    `rgba(${rr},${rg},${rb},0)`);
        ribbon(x0, y0, c1x, c1y, c2x, c2y, x1, y1, d * 0.20, glo, d * 0.036);

        // Ribbon body
        const g1 = ctx.createLinearGradient(x0, y0, x1, y1);
        g1.addColorStop(0,    `rgba(${rr},${rg},${rb},0)`);
        g1.addColorStop(0.18, `rgba(${rr},${rg},${rb},0.20)`);
        g1.addColorStop(0.50, `rgba(${rr},${rg},${rb},0.32)`);
        g1.addColorStop(0.78, `rgba(${rr},${rg},${rb},0.20)`);
        g1.addColorStop(1,    `rgba(${rr},${rg},${rb},0)`);
        ribbon(x0, y0, c1x, c1y, c2x, c2y, x1, y1, d * 0.092, g1);

        // Silk sheen — thin highlight offset upward
        const ho = d * 0.014;
        const gh = ctx.createLinearGradient(x0, y0, x1, y1);
        gh.addColorStop(0,    `rgba(${sr},${sg},${sb},0)`);
        gh.addColorStop(0.32, `rgba(${sr},${sg},${sb},0.10)`);
        gh.addColorStop(0.56, `rgba(${sr},${sg},${sb},0.16)`);
        gh.addColorStop(0.80, `rgba(${sr},${sg},${sb},0.08)`);
        gh.addColorStop(1,    `rgba(${sr},${sg},${sb},0)`);
        ribbon(x0, y0 - ho, c1x, c1y - ho, c2x, c2y - ho, x1, y1 - ho, d * 0.020, gh);
      }

      // ── RIBBON 2 — Counter-arc (upper-left → belly-down → upper-right) ─
      {
        const x0  = px(-0.31 + b2 * 0.038);  const y0  = py(-0.20 + b4 * 0.028);
        const c1x = px( 0.02 + b1 * 0.054);  const c1y = py( 0.24 + b3 * 0.044);
        const c2x = px( 0.18 + b4 * 0.044);  const c2y = py( 0.10 + b2 * 0.034);
        const x1  = px( 0.33 + b3 * 0.028);  const y1  = py(-0.15 + b1 * 0.026);

        // Soft halo
        const glo2 = ctx.createLinearGradient(x0, y0, x1, y1);
        glo2.addColorStop(0,    `rgba(${rr},${rg},${rb},0)`);
        glo2.addColorStop(0.40, `rgba(${rr},${rg},${rb},0.08)`);
        glo2.addColorStop(1,    `rgba(${rr},${rg},${rb},0)`);
        ribbon(x0, y0, c1x, c1y, c2x, c2y, x1, y1, d * 0.16, glo2, d * 0.030);

        // Ribbon body — slightly cooler for perceived depth
        const g2 = ctx.createLinearGradient(x0, y0, x1, y1);
        g2.addColorStop(0,    `rgba(${rr},${rg},${rb},0)`);
        g2.addColorStop(0.22, `rgba(${rr},${rg},${rb},0.16)`);
        g2.addColorStop(0.54, `rgba(${rr},${rg},${rb},0.26)`);
        g2.addColorStop(0.80, `rgba(${rr},${rg},${rb},0.15)`);
        g2.addColorStop(1,    `rgba(${rr},${rg},${rb},0)`);
        ribbon(x0, y0, c1x, c1y, c2x, c2y, x1, y1, d * 0.068, g2);

        // Sheen
        const ho2 = d * 0.012;
        const gh2 = ctx.createLinearGradient(x0, y0, x1, y1);
        gh2.addColorStop(0,    `rgba(${sr},${sg},${sb},0)`);
        gh2.addColorStop(0.42, `rgba(${sr},${sg},${sb},0.08)`);
        gh2.addColorStop(1,    `rgba(${sr},${sg},${sb},0)`);
        ribbon(x0, y0 - ho2, c1x, c1y - ho2, c2x, c2y - ho2, x1, y1 - ho2, d * 0.016, gh2);
      }

      // ── RIBBON 3 — Looping arc (upper-right → sweeps left → lower-right) ─
      {
        const x0  = px( 0.22 + b3 * 0.036);  const y0  = py(-0.28 + b1 * 0.026);
        const c1x = px(-0.28 + b4 * 0.054);  const c1y = py(-0.06 + b2 * 0.044);
        const c2x = px(-0.10 + b1 * 0.044);  const c2y = py( 0.26 + b3 * 0.036);
        const x1  = px( 0.24 + b2 * 0.026);  const y1  = py( 0.22 + b4 * 0.026);

        const g3 = ctx.createLinearGradient(x0, y0, x1, y1);
        g3.addColorStop(0,    `rgba(${rr},${rg},${rb},0)`);
        g3.addColorStop(0.28, `rgba(${rr},${rg},${rb},0.14)`);
        g3.addColorStop(0.58, `rgba(${rr},${rg},${rb},0.22)`);
        g3.addColorStop(0.82, `rgba(${rr},${rg},${rb},0.13)`);
        g3.addColorStop(1,    `rgba(${rr},${rg},${rb},0)`);
        ribbon(x0, y0, c1x, c1y, c2x, c2y, x1, y1, d * 0.050, g3);

        // Thin sheen stripe
        const ho3 = d * 0.010;
        const gh3 = ctx.createLinearGradient(x0, y0, x1, y1);
        gh3.addColorStop(0,    `rgba(${sr},${sg},${sb},0)`);
        gh3.addColorStop(0.44, `rgba(${sr},${sg},${sb},0.08)`);
        gh3.addColorStop(1,    `rgba(${sr},${sg},${sb},0)`);
        ribbon(x0, y0 - ho3, c1x, c1y - ho3, c2x, c2y - ho3, x1, y1 - ho3, d * 0.014, gh3);
      }

      // ── FOCAL ANCHOR — dense warm sphere at ribbon intersection ─────────
      {
        const fx = cx + b1 * d * 0.012;
        const fy = cy + b2 * d * 0.010;
        const fr = d * (0.074 + b3 * 0.008);

        // Outer warm halo
        const gOuter = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr * 2.0);
        gOuter.addColorStop(0,    `rgba(${rr},${rg},${rb},0.22)`);
        gOuter.addColorStop(0.45, `rgba(${rr},${rg},${rb},0.10)`);
        gOuter.addColorStop(1,    `rgba(${rr},${rg},${rb},0)`);
        ctx.fillStyle = gOuter;
        ctx.beginPath();
        ctx.arc(fx, fy, fr * 2.0, 0, Math.PI * 2);
        ctx.fill();

        // Tight deep core with blur
        const gCore = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
        gCore.addColorStop(0,    `rgba(${dr},${dg},${db},0.58)`);
        gCore.addColorStop(0.34, `rgba(${dr},${dg},${db},0.36)`);
        gCore.addColorStop(0.70, `rgba(${dr},${dg},${db},0.12)`);
        gCore.addColorStop(1,    `rgba(${dr},${dg},${db},0)`);
        ctx.save();
        ctx.filter = `blur(${d * 0.008}px)`;
        ctx.fillStyle = gCore;
        ctx.beginPath();
        ctx.arc(fx, fy, fr, 0, Math.PI * 2);
        ctx.fill();
        ctx.filter = 'none';
        ctx.restore();

        // Silk pinpoint highlight — offset upper-left
        const gPin = ctx.createRadialGradient(
          fx - d * 0.016, fy - d * 0.020, 0,
          fx, fy, fr * 0.40,
        );
        gPin.addColorStop(0,   `rgba(${sr},${sg},${sb},0.20)`);
        gPin.addColorStop(0.5, `rgba(${sr},${sg},${sb},0.08)`);
        gPin.addColorStop(1,   `rgba(${sr},${sg},${sb},0)`);
        ctx.fillStyle = gPin;
        ctx.beginPath();
        ctx.arc(fx, fy, fr * 0.40, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Subtle depth vignette ────────────────────────────────────────────
      {
        const vg = ctx.createRadialGradient(cx, cy, d * 0.14, cx, cy, d * 0.90);
        vg.addColorStop(0,    'rgba(190,165,130,0)');
        vg.addColorStop(0.72, `rgba(178,152,118,0.014)`);
        vg.addColorStop(1,    `rgba(162,136,104,0.044)`);
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [isDark, colorSeed]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ display: 'block' }}
    />
  );
}