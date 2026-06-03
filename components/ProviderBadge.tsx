type Provider =
  | "recreation.gov"
  | "reservecalifornia"
  | "bc-parks"
  | "parks-canada"
  | "usedirect"
  | "goingtoccamp"
  | "reserveamerica";

const PROVIDERS: Record<
  Provider,
  { label: string; bg: string; text: string; icon: string }
> = {
  "recreation.gov": {
    label: "Recreation.gov",
    bg: "#DBEAFE",
    text: "#1E40AF",
    icon: "🏛️",
  },
  reservecalifornia: {
    label: "ReserveCalifornia",
    bg: "#DCFCE7",
    text: "#166534",
    icon: "🐻",
  },
  "bc-parks": {
    label: "BC Parks",
    bg: "#FEF3C7",
    text: "#92400E",
    icon: "🍁",
  },
  "parks-canada": {
    label: "Parks Canada",
    bg: "#FEF3C7",
    text: "#92400E",
    icon: "🍁",
  },
  usedirect: {
    label: "UseDirect",
    bg: "#F3F4F6",
    text: "#374151",
    icon: "🗺️",
  },
  goingtoccamp: {
    label: "GoingToCamp",
    bg: "#F5F3FF",
    text: "#5B21B6",
    icon: "⛺",
  },
  reserveamerica: {
    label: "ReserveAmerica",
    bg: "#FFF7ED",
    text: "#9A3412",
    icon: "🏕️",
  },
};

interface ProviderBadgeProps {
  provider: Provider;
  className?: string;
}

export function ProviderBadge({ provider, className = "" }: ProviderBadgeProps) {
  const config = PROVIDERS[provider];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  );
}
