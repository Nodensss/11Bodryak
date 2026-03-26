import ReunionApp from "@/app/components/ReunionApp";
import { DATE_OPTIONS } from "@/lib/dates";

export default function HomePage() {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="page-shell mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-white/60 shadow-card">
        <section className="border-b border-sky/70 px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent/80">
                11 «Б» • лето 2026
              </p>
              <div className="space-y-3">
                <h1 className="text-balance font-serif text-4xl leading-tight text-ink sm:text-5xl">
                  Встреча выпускников 11 «Б» — выбери удобный день!
                </h1>
                <p className="max-w-2xl text-base leading-7 text-ink/75 sm:text-lg">
                  Отметь все подходящие даты, посмотри общую картину по
                  голосованию и обсуди детали встречи прямо на этой странице.
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-[24px] border border-accent/10 bg-white/80 p-4 backdrop-blur sm:grid-cols-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent/70">
                  Формат
                </div>
                <div className="mt-1 text-sm text-ink/80">
                  Одностраничное голосование без регистрации
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent/70">
                  Период
                </div>
                <div className="mt-1 text-sm text-ink/80">
                  8 недель, с 5 июня по 26 июля 2026
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent/70">
                  Комментарии
                </div>
                <div className="mt-1 text-sm text-ink/80">
                  Общая лента с новыми сообщениями сверху
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
