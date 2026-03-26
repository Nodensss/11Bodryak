# Class Reunion App

Приложение для планирования встречи выпускников 11 «Б»: голосование по датам, таблица результатов и общая лента комментариев.

## Что реализовано

- SPA на `Next.js App Router` с двумя вкладками: `Голосование` и `Результаты и обсуждение`
- Форма голосования с валидацией имени и обязательным выбором минимум одной даты
- Автогенерация дат на 8 недель вперёд, начиная с июня 2026 года
- Защита от повторного голосования через `localStorage` с возможностью перезаписать голос
- Сводная таблица с подсветкой лучших дат и общим числом проголосовавших
- Лента комментариев с сохранением в PostgreSQL
- API на Route Handlers: `GET/POST /api/votes`, `GET/POST /api/comments`
- Prisma + PostgreSQL

## Стек

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS`
- `Prisma`
- `PostgreSQL` (`Neon`, `Vercel Postgres`, `Supabase` или любой совместимый инстанс)

## Переменные окружения

Создай файл `.env` по образцу `.env.example`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/class_reunion?schema=public"
ADMIN_SECRET="change-me"
```

## Локальный запуск

1. Установить зависимости:

```bash
npm install
```

2. Настроить `.env` с рабочим `DATABASE_URL`.

`ADMIN_SECRET` необязателен, но нужен, если хочешь использовать админ-панель для очистки старых голосов и комментариев прямо с сайта.

3. Применить миграции:

```bash
npm run prisma:deploy
```

4. Запустить dev-сервер:

```bash
npm run dev
```

Приложение будет доступно на `http://localhost:3000`.

## Полезные команды

```bash
npm run dev
npm run lint
npm run build
npm run prisma:deploy
npm run prisma:migrate
npm run prisma:studio
```

## Деплой на Vercel

### 1. Подготовить репозиторий

```bash
git init
git add .
git commit -m "Initial class reunion app"
```

Затем запушить проект в GitHub.

### 2. Подготовить PostgreSQL

Подойдёт любой внешний PostgreSQL:

- `Neon`
- `Vercel Postgres`
- `Supabase`

Нужна обычная строка подключения, которую Prisma сможет использовать как `DATABASE_URL`.

### 3. Создать проект в Vercel

1. Открыть Vercel
2. Нажать `Add New Project`
3. Подключить GitHub-репозиторий
4. Выбрать этот проект

### 4. Настроить Environment Variables

Добавить переменную:

- `DATABASE_URL` = строка подключения к PostgreSQL
- `ADMIN_SECRET` = секрет для админ-панели очистки данных

### 5. Указать build command

В настройках Vercel для проекта укажи:

- `Install Command`: `npm install`
- `Build Command`: `npm run build:vercel`
- `Output Directory`: оставить пустым

`npm run build:vercel` сначала применит Prisma-миграции, затем соберёт Next.js-приложение.

### 6. Задеплоить

После первого деплоя Vercel выдаст адрес вида:

```text
your-project.vercel.app
```

Каждый новый push в основную ветку будет триггерить автоматический redeploy.

## Prisma

Схема лежит в [prisma/schema.prisma](/c:/Users/Slavonishe/TestClass/prisma/schema.prisma).
Начальная миграция уже добавлена в [prisma/migrations/20260326000000_init/migration.sql](/c:/Users/Slavonishe/TestClass/prisma/migrations/20260326000000_init/migration.sql).

Если схема меняется:

```bash
npm run prisma:migrate -- --name your_change_name
```

После этого закоммить новую миграцию и отправь её в репозиторий.

## Проверка проекта

Проверено локально:

- `npm run lint`
- `npm run build`
- `npx prisma validate` с временной `DATABASE_URL`

## Структура

```text
app/
  api/
    comments/route.ts
    votes/route.ts
  components/
    CommentSection.tsx
    DateCheckbox.tsx
    ReunionApp.tsx
    ResultsTable.tsx
    Toast.tsx
    VoteForm.tsx
  globals.css
  icon.tsx
  layout.tsx
  page.tsx
lib/
  api.ts
  dates.ts
  db.ts
  types.ts
  validation.ts
prisma/
  migrations/
  schema.prisma
```
