type AvailStatus = "available" | "booked" | "releasing" | "walk-up" | "unknown";

const STATUS_STYLES: Record<AvailStatus, { color: string; outlined?: boolean; animate?: boolean }> = {
  available:  { color: "var(--available)" },
  booked:     { color: "var(--booked)" },
  releasing:  { color: "var(--releasing)", animate: true },
  "walk-up":  { color: "var(--available)", outlined: true },
  unknown:    { color: "var(--booked)" },
};

interface AvailabilityDotProps {
  status: AvailStatus;
  size?: number;
  className?: string;
}

export function AvailabilityDot({ status, size = 8, className = "" }: AvailabilityDotProps) {
  const config = STATUS_STYLES[status];

  if (status === "unknown") {
    return (
      <span
        className={`inline-block font-mono text-xs leading-none ${className}`}
        style={{ color: config.color }}
        aria-label="Unknown availability"
      >
        —
      </span>
    );
  }

  if (config.outlined) {
    return (
      <span
        className={`inline-block rounded-full border-2 ${className}`}
        style={{
          width: size,
          height: size,
          borderColor: config.color,
          backgroundColor: "transparent",
        }}
        aria-label="Walk-up availability"
      />
    );
  }

  return (
    <span
      className={`inline-block rounded-full ${config.animate ? "pulse-dot" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: config.color,
      }}
      aria-label={`${status} site`}
    />
  );
}
