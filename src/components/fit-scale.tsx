import { cx } from "./ui";

/**
 * Where an asset sits on the 1-5 risk scale, next to the range the person's
 * investor profile is comfortable with. Inside the shaded zone reads as fine;
 * the further right of it, the bigger the stretch.
 */
export function FitScale({
  risk,
  level,
  labels,
  zoneLabel,
  assetLabel,
}: {
  /** Asset risk, 1 to 5 (may be fractional). */
  risk: number;
  /** Profile level, 1 to 5: comfortable up to and including this step. */
  level: number;
  /** Five step names, lowest risk first. */
  labels: string[];
  zoneLabel: string;
  assetLabel: string;
}) {
  const step = Math.min(5, Math.max(1, Math.round(risk)));
  const over = step - level;
  const tone = over <= 0 ? "ok" : over === 1 ? "stretch" : "far";
  const markerClass = tone === "ok" ? "bg-brand text-on-brand" : tone === "stretch" ? "bg-accent text-ink" : "bg-neg text-on-brand";
  const arrowClass = tone === "ok" ? "border-t-brand" : tone === "stretch" ? "border-t-accent" : "border-t-neg";
  const center = ((step - 0.5) / 5) * 100;

  return (
    <div className="mt-6">
      {/* The asset, pointing down at its step. */}
      <div className="relative h-9">
        <span
          className={cx(
            "absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[12.5px] font-semibold",
            markerClass,
            step === 1 && "translate-x-[-20%]",
            step === 5 && "translate-x-[-80%]",
          )}
          style={{ left: `${center}%` }}
        >
          {assetLabel}
        </span>
        <span
          aria-hidden="true"
          className={cx("absolute bottom-0 h-0 w-0 -translate-x-1/2 border-x-[7px] border-t-[8px] border-x-transparent", arrowClass)}
          style={{ left: `${center}%` }}
        />
      </div>

      <ol className="mt-1 grid grid-cols-5 gap-1" aria-label={labels.join(", ")}>
        {labels.map((label, i) => {
          const n = i + 1;
          const inZone = n <= level;
          const here = n === step;
          return (
            <li key={label} className="min-w-0">
              <div
                className={cx(
                  "h-3 rounded-full",
                  here ? (tone === "ok" ? "bg-brand" : tone === "stretch" ? "bg-accent" : "bg-neg") : inZone ? "bg-brand-soft" : "bg-sunken",
                  inZone && !here && "ring-1 ring-inset ring-brand/25",
                )}
              />
              <p className={cx("mt-1.5 text-center text-[11.5px] leading-tight", here ? "font-semibold text-ink" : "text-ink-3")}>{label}</p>
            </li>
          );
        })}
      </ol>

      {/* The comfort zone, as a bracket under the steps it covers. */}
      <div className="relative mt-2 h-6">
        <div
          className="absolute top-0 h-2 rounded-b-md border-x-2 border-b-2 border-brand"
          style={{ left: "2px", width: `calc(${(level / 5) * 100}% - 4px)` }}
        />
        <p className="absolute top-2.5 text-[12px] font-medium text-brand-ink" style={{ left: "0" }}>
          {zoneLabel}
        </p>
      </div>
    </div>
  );
}
