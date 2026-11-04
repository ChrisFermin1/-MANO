"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { JobStatusTag, PageHeader, Screen, Title } from "@/components/ui";
import { getJobs, onJobsChange, type Job } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { dayKey, fmtTime, jobsOn, needsDay, weekDays, weekStart } from "@/lib/schedule";
import { serviceLabel } from "@/lib/services";

// "What am I doing this week?" Monday → Sunday, each day's jobs by time; approved jobs without a day underneath.
export default function Agenda() {
  const { t, lang } = useLang();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [start, setStart] = useState(() => weekStart(new Date()));

  useEffect(() => {
    getJobs().then(setJobs);
    return onJobsChange(() => void getJobs().then(setJobs));
  }, []);
  if (!jobs) return <Screen>{null}</Screen>;

  const days = weekDays(start);
  const today = dayKey(new Date());
  const thisWeek = dayKey(weekStart(new Date())) === dayKey(start);
  const loc = lang === "es" ? "es-US" : "en-US";
  const range = `${days[0].toLocaleDateString(loc, { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString(loc, { month: "short", day: "numeric" })}`;
  const count = days.reduce((n, d) => n + jobsOn(jobs, dayKey(d)).length, 0);
  const waiting = needsDay(jobs);
  const move = (weeks: number) => setStart(new Date(start.getFullYear(), start.getMonth(), start.getDate() + weeks * 7));

  const row = (j: Job) => (
    <Link key={j.id} href={`/trabajos/${j.id}`} className="flex items-start gap-3 rounded-[12px] px-3 py-2.5 transition hover:bg-ivory/70 lg:flex-col lg:gap-0.5 lg:px-2">
      <span className="w-[4.75rem] shrink-0 whitespace-nowrap pt-0.5 text-sm font-semibold tabular-nums text-forest lg:w-auto lg:pr-1">{j.scheduled_time ? fmtTime(j.scheduled_time, lang) : "—"}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{j.customer_name || "—"}</span>
        <span className="block truncate text-sm text-muted">{j.address?.trim() || serviceLabel(j.service, lang, j.service_es)}</span>
      </span>
      {/* desktop columns are narrow: time, client, place stacked; the tag stays on the phone list */}
      <span className="hidden shrink-0 sm:block lg:hidden">
        <JobStatusTag job={j} />
      </span>
    </Link>
  );

  return (
    <Screen className="lg:max-w-[1100px]!">
      <PageHeader backHref="/inicio" />
      <Title>{t.agendaTitle}</Title>

      {/* the week: back · "Oct 19 – 25" · forward, and a way home to this week */}
      <div className="mt-4 flex items-center gap-2">
        <button type="button" onClick={() => move(-1)} aria-label={t.agendaPrev} className="flex size-10 items-center justify-center rounded-full bg-white ring-1 ring-black/5">
          <ChevronLeft className="size-5" />
        </button>
        <p className="min-w-0 flex-1 text-center text-base font-semibold">
          {thisWeek ? t.agendaThisWeek : range}
          <span className="block text-xs font-normal text-muted">{thisWeek ? range : t.agendaWeekCount(count)}</span>
        </p>
        <button type="button" onClick={() => move(1)} aria-label={t.agendaNext} className="flex size-10 items-center justify-center rounded-full bg-white ring-1 ring-black/5">
          <ChevronRight className="size-5" />
        </button>
      </div>
      {!thisWeek && (
        <button type="button" onClick={() => setStart(weekStart(new Date()))} className="mt-2 self-center text-sm font-semibold text-forest underline underline-offset-4">
          {t.agendaToday}
        </button>
      )}

      {/* phone: one list, day by day · desktop: the 7 days side by side */}
      <ol className="mt-5 space-y-3 lg:grid lg:grid-cols-7 lg:gap-3 lg:space-y-0">
        {days.map((d) => {
          const key = dayKey(d);
          const list = jobsOn(jobs, key);
          const isToday = key === today;
          return (
            <li key={key} className={`rounded-[16px] glass p-2 lg:min-h-[180px] ${isToday ? "ring-2 ring-forest/40" : ""}`}>
              <p className={`flex items-baseline justify-between px-3 pb-1 pt-1.5 text-sm lg:flex-col lg:px-2 ${isToday ? "font-bold text-forest" : "font-semibold"}`}>
                <span className="capitalize">{d.toLocaleDateString(loc, { weekday: "long" })}</span>
                <span className="text-muted tabular-nums">{d.toLocaleDateString(loc, { month: "short", day: "numeric" })}</span>
              </p>
              {list.length ? (
                <div className="divide-y divide-black/5">{list.map(row)}</div>
              ) : (
                <p className="px-3 pb-2 text-sm text-charcoal/35 lg:px-2">{t.agendaFree}</p>
              )}
            </li>
          );
        })}
      </ol>

      {/* approved, waiting for a day: the next thing to do for each */}
      {waiting.length > 0 && (
        <section className="mt-6 rounded-[16px] glass-peach p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ojo-ink">
            <CalendarDays className="size-4" strokeWidth={2} /> {t.agendaNeedsDay} · {waiting.length}
          </h2>
          <p className="mt-1 text-sm text-ojo-ink/80">{t.agendaNeedsDayHint}</p>
          <ul className="mt-2 space-y-1">
            {waiting.map((j) => (
              <li key={j.id}>
                <Link href={`/trabajos/${j.id}`} className="flex items-center justify-between rounded-[10px] bg-white/70 px-3 py-2 text-sm font-semibold">
                  {j.customer_name || "—"} <ChevronRight className="size-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Screen>
  );
}
