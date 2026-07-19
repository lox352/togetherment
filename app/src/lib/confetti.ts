/** Tiny dependency-free confetti burst in the house palette. */
const COLORS = ["#a2402e", "#46604a", "#f6efe3", "#a8762a", "#d1705c", "#ffd98a"];

export function fireConfetti(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:999";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.remove();

  const particles = Array.from({ length: 80 }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.4,
    y: canvas.height * 0.35,
    vx: (Math.random() - 0.5) * 9,
    vy: -4 - Math.random() * 7,
    size: 5 + Math.random() * 5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
  }));

  const started = performance.now();
  const tick = (now: number) => {
    const elapsed = now - started;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - elapsed / 1800);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (elapsed < 1800) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}
