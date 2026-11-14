import { Car, GraduationCap, House, Plane, Sparkles, type LucideIcon } from "lucide-react";
import type { GoalKind } from "@/lib/savings-goals";

export const GOAL_ICON: Record<GoalKind, LucideIcon> = { car: Car, trip: Plane, home: House, study: GraduationCap, other: Sparkles };
