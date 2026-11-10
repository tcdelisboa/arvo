/**
 * Growth rings: the one decorative element in the product. Concentric arcs
 * from a single origin, like the rings of a tree that started small.
 */
export function Rings({ className, tone = "onBrand" }: { className?: string; tone?: "onBrand" | "brand" }) {
  const stroke = tone === "onBrand" ? "var(--on-brand)" : "var(--brand)";
  const radii = [60, 120, 185, 255, 330, 410, 495, 585];
  return (
    <svg viewBox="0 0 640 640" fill="none" className={className} aria-hidden="true">
      {radii.map((r, i) => (
        <path
          key={r}
          d={`M 40 ${600 - r} A ${r} ${r} 0 0 1 ${40 + r} 600`}
          stroke={i === radii.length - 3 ? "var(--accent)" : stroke}
          strokeOpacity={i === radii.length - 3 ? 0.95 : 0.1 + i * 0.035}
          strokeWidth={i === radii.length - 3 ? 3 : 2}
          strokeLinecap="round"
        />
      ))}
      <circle cx="40" cy="600" r="7" fill={tone === "onBrand" ? "var(--accent)" : "var(--brand)"} />
    </svg>
  );
}
