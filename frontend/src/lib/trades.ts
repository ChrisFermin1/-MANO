import { Bath, BrickWall, Ellipsis, Grid2x2, Hammer, PaintRoller, type LucideIcon } from "lucide-react";
import type { TradeId } from "@/lib/i18n";

export const TRADES: { id: TradeId; icon: LucideIcon }[] = [
  { id: "painting", icon: PaintRoller },
  { id: "drywall", icon: BrickWall },
  { id: "flooring", icon: Grid2x2 },
  { id: "bathKitchen", icon: Bath },
  { id: "remodel", icon: Hammer },
  { id: "other", icon: Ellipsis },
];
