import React from "react";
import { GraduationCap, Quote, School, Shield } from "lucide-react";
import { ROLE_THEME, type RoleKey } from "@/lib/role-theme";
import {
  AdminCampusIllustration,
  StudentStudyIllustration,
  TeacherChalkboardIllustration,
} from "@/components/ui/Illustrations";

/* ─────────────────────────────────────────────────────────────────────────
   Daily quotes — a shared pool plus a few role-specific picks.
   One quote is chosen per (UTC) day so it feels fresh without flickering.
   ───────────────────────────────────────────────────────────────────────── */

interface DailyQuoteItem {
  text: string;
  author: string;
}

const SHARED_QUOTES: DailyQuoteItem[] = [
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
];

const ROLE_QUOTES: Record<RoleKey, DailyQuoteItem[]> = {
  admin: [
    { text: "Alone we can do so little; together we can do so much.", author: "Helen Keller" },
    { text: "Coming together is a beginning, staying together is progress, and working together is success.", author: "Henry Ford" },
  ],
  teacher: [
    { text: "Education is not the filling of a pail, but the lighting of a fire.", author: "W.B. Yeats" },
    { text: "Teaching is the one profession that creates all other professions.", author: "Unknown" },
    { text: "What we learn with pleasure we never forget.", author: "Alfred Mercier" },
  ],
  student: [
    { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
    { text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss" },
    { text: "Mistakes are proof that you are trying.", author: "Unknown" },
  ],
};

/** Day number since the Unix epoch (UTC) — stable between server render and hydration. */
function getDayIndex(): number {
  return Math.floor(Date.now() / 86_400_000);
}

function pickDailyQuote(role: RoleKey): DailyQuoteItem {
  const pool = [...ROLE_QUOTES[role], ...SHARED_QUOTES];
  return pool[getDayIndex() % pool.length];
}

/* ─────────────────────────────────────────────────────────────────────────
   WelcomeHero
   ───────────────────────────────────────────────────────────────────────── */

const ROLE_ICON = { admin: Shield, teacher: School, student: GraduationCap } as const;

const ROLE_ILLUSTRATION = {
  admin: AdminCampusIllustration,
  teacher: TeacherChalkboardIllustration,
  student: StudentStudyIllustration,
} as const;

interface WelcomeHeroProps {
  role: RoleKey;
  /** Name to greet; shows a skeleton while `loading` */
  name?: string | null;
  loading?: boolean;
  /** Small muted text beside the role badge (e.g. "Academic Year 2026") */
  meta?: string;
  /** Extra pill badges beside the role badge */
  badges?: React.ReactNode;
  /** Whether to show the role portal badge (e.g. Student Portal). Defaults to true */
  showRoleBadge?: boolean;
  description: string;
  /** Primary call-to-action buttons */
  actions?: React.ReactNode;
  /** Extra widget shown next to the illustration (e.g. a score card) */
  aside?: React.ReactNode;
  /** Custom illustration/avatar override (e.g. customized Student Avatar) */
  customIllustration?: React.ReactNode;
}

export function WelcomeHero({
  role,
  name,
  loading = false,
  meta,
  badges,
  showRoleBadge = true,
  description,
  actions,
  aside,
  customIllustration,
}: WelcomeHeroProps) {
  const t = ROLE_THEME[role];
  const RoleIcon = ROLE_ICON[role];
  const Illustration = ROLE_ILLUSTRATION[role];
  const quote = pickDailyQuote(role);

  const hasBadgesRow = showRoleBadge || Boolean(badges) || Boolean(meta);

  return (
    <section
      aria-labelledby="welcome-hero-title"
      className="relative overflow-hidden rounded-[28px] sm:rounded-4xl border border-border-emphasis/60 bg-surface-raised/90 shadow-xl backdrop-blur-xl"
    >
      {/* Role gradient ribbon */}
      <div className={`h-1.5 w-full bg-linear-to-r ${t.bar}`} />

      {/* Ambient role glows */}
      <div className={`pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full blur-3xl ${t.heroGlowA}`} />
      <div className={`pointer-events-none absolute -left-16 -bottom-28 h-64 w-64 rounded-full blur-3xl ${t.heroGlowB}`} />

      <div className="relative z-10 grid items-center gap-6 p-5 sm:p-8 md:grid-cols-[1fr_auto]">
        {/* ── Text column ── */}
        <div className="min-w-0">
          {hasBadgesRow && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {showRoleBadge && (
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${t.badge}`}>
                  <RoleIcon className="h-3.5 w-3.5" />
                  {t.label}
                </span>
              )}
              {badges}
              {meta && <span className="text-xs font-medium text-text-muted">{meta}</span>}
            </div>
          )}

          <h1
            id="welcome-hero-title"
            className="flex flex-wrap items-center gap-x-2 text-2xl font-black tracking-tight text-text-primary sm:text-3xl lg:text-4xl"
          >
            Welcome back,
            {loading || !name ? (
              <span className="inline-block h-8 w-36 animate-pulse rounded-lg bg-surface-muted align-middle" />
            ) : (
              <span className="gradient-text">{name}</span>
            )}
          </h1>

          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-text-muted sm:text-sm">{description}</p>

          {actions && <div className="mt-5 flex flex-wrap items-center gap-3">{actions}</div>}
        </div>

        {/* ── Illustration / aside column ── */}
        <div className="flex items-center gap-6 md:justify-end">
          {aside}
          {customIllustration ? (
            <div className="shrink-0">{customIllustration}</div>
          ) : (
            <Illustration className="hidden h-44 w-56 shrink-0 drop-shadow-lg md:block lg:h-48 lg:w-64" />
          )}
        </div>
      </div>

      {/* ── Quote of the day ── */}
      <figure className="relative z-10 flex items-start gap-3 border-t border-border-default/70 bg-surface-base/50 px-5 py-3.5 sm:px-8">
        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${t.badge}`}>
          <Quote className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-text-faint">
            Thought for today
          </span>
          <blockquote suppressHydrationWarning className="text-xs italic leading-relaxed text-text-secondary sm:text-[13px]">
            &ldquo;{quote.text}&rdquo;
            <cite className={`ml-1.5 not-italic font-semibold ${t.text}`}>— {quote.author}</cite>
          </blockquote>
        </div>
      </figure>
    </section>
  );
}
