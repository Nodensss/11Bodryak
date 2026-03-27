import ReunionApp from "@/app/components/ReunionApp";
import { DATE_OPTIONS } from "@/lib/dates";

export default function HomePage() {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="page-shell mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-white/60 shadow-card">
        <section className="relative overflow-hidden border-b border-sky/50 px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
          {/* Decorative gradient blobs */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-accent/10 to-sky/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-gradient-to-tr from-indigo-200/20 to-sky/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-white/80 px-4 py-1.5 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="text-sm font-semibold tracking-wide text-accent/90">
                  11 «Б» — лето 2026
                </span>
              </div>
              <div className="space-y-3">
                <h1 className="text-balance font-serif text-4xl leading-tight text-ink sm:text-5xl">
                  Встреча выпускников — выбери удобный день!
                </h1>
                <p className="max-w-2xl text-base leading-7 text-ink/65 sm:text-lg">
                  Отметь все подходящие даты, посмотри общую картину по
                  голосованию и обсуди детали встречи прямо на этой странице.
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-[24px] border border-ink/5 bg-white/70 p-4 shadow-sm backdrop-blur sm:grid-cols-3">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent/60">
                  Формат
                </div>
                <div className="text-sm text-ink/75">
                  Голосование без регистрации
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent/60">
                  Период
                </div>
                <div className="text-sm text-ink/75">
                  Июнь — сентябрь 2026
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent/60">
                  Обсуждение
                </div>
                <div className="text-sm text-ink/75">
                  Комментарии на сайте
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex-1 px-5 py-6 sm:px-8 lg:px-12 lg:py-8">
          <ReunionApp dateOptions={DATE_OPTIONS} />
        </section>
      </div>
    </main>
  );
}
