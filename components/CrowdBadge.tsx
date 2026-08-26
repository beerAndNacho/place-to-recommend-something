import { CROWD_META } from "@/lib/crowd";
import type { CrowdLevel } from "@/types/place";

export function CrowdBadge({ level, compact = false }: { level: CrowdLevel; compact?: boolean }) {
  return (
    <span className={`crowd-badge crowd-badge--${level}${compact ? " crowd-badge--compact" : ""}`}>
      <span className="crowd-badge__dot" />
      {CROWD_META[level].label}
    </span>
  );
}
