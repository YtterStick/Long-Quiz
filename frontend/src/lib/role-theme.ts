/**
 * Role-based accent theme used by the shared dashboard shell
 * (DashboardBackdrop + WelcomeHero).
 *
 * Every class below is written as a full literal string so Tailwind's
 * scanner can detect and generate it — never build these dynamically.
 *
 *   Admin   → Tan   (warm, institutional)
 *   Teacher → Steel (calm, focused)
 *   Student → Sage  (growth, encouragement)
 */

export type RoleKey = "admin" | "teacher" | "student";

export interface RoleTheme {
  label: string;
  /** Pill badge (bg + text + border) */
  badge: string;
  /** Large ambient glows behind the whole page */
  glowA: string;
  glowB: string;
  /** Glows inside the welcome hero card */
  heroGlowA: string;
  heroGlowB: string;
  /** Thin gradient bar at the top of the hero */
  bar: string;
  /** Doodle stroke colours for the backdrop */
  stroke: string;
  strokeSoft: string;
  star: string;
  /** Solid accent text colour */
  text: string;
}

export const ROLE_THEME: Record<RoleKey, RoleTheme> = {
  admin: {
    label: "Admin Console",
    badge: "bg-tan-ghost text-tan border-tan-border",
    glowA: "bg-tan/20",
    glowB: "bg-cream/15",
    heroGlowA: "bg-tan/15",
    heroGlowB: "bg-cream/15",
    bar: "from-tan via-cream to-steel",
    stroke: "text-tan/60",
    strokeSoft: "text-tan/35",
    star: "text-tan",
    text: "text-tan",
  },
  teacher: {
    label: "Teacher Workspace",
    badge: "bg-steel-ghost text-steel border-steel-border",
    glowA: "bg-steel/20",
    glowB: "bg-tan/12",
    heroGlowA: "bg-steel/15",
    heroGlowB: "bg-tan/12",
    bar: "from-steel via-steel-light to-tan",
    stroke: "text-steel/60",
    strokeSoft: "text-steel/35",
    star: "text-steel",
    text: "text-steel",
  },
  student: {
    label: "Student Portal",
    badge: "bg-sage-ghost text-sage border-sage-border",
    glowA: "bg-sage/20",
    glowB: "bg-steel/12",
    heroGlowA: "bg-sage/15",
    heroGlowB: "bg-steel/12",
    bar: "from-sage via-sage-light to-steel",
    stroke: "text-sage/60",
    strokeSoft: "text-sage/35",
    star: "text-sage",
    text: "text-sage",
  },
};
