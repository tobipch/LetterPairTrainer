# 3BLD Letterpair Trainer

A single-user web app for training 3x3 Blindfolded speedcubing letter pairs (memo associations). Built with Next.js 15, Drizzle ORM, Neon/Postgres, and Vercel Blob.

## Features

- **Training mode**: Show letterpair or word, timer, 3-button rating (Instant / Slow / Fail), keyboard shortcuts
- **Confusion tracking**: On fail, log what you were confused with
- **Modes**: Daily All (every pair once per day), Hard Only (top 50 by difficulty), Custom
- **Overview table**: All pairs with stats, sortable, filterable, inline word edit
- **Heatmap**: 21×21 difficulty grid colored green→red
- **Detail page**: Per-pair stats, history chart, image upload (Vercel Blob), description editor
- **Dashboard**: Streak, today's progress, quick stats, daily word prompt
- **Settings**: Direction default, slow threshold, password change

## Setup

### Prerequisites

- Node.js 18+
- A Neon (or Vercel Postgres) database
- A Vercel Blob store (for images)

### 1. Clone & install

```bash
git clone <repo>
cd letterpair-trainer
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string (Neon or Vercel Postgres) |
| `SESSION_SECRET` | Random string ≥ 32 chars for iron-session |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token |
| `SEED_USERNAME` | Username for the initial user (default: `admin`) |
| `SEED_PASSWORD` | Password for the initial user (default: `changeme123`) |

### 3. Run migrations

```bash
npm run db:generate  # generate SQL from schema
npm run db:migrate   # apply to DB
```

### 4. Seed the user

```bash
npm run seed
```

### 5. Import your CSV

```bash
npm run import -- --file path/to/letterpairs.csv
```

**CSV format**: 21×21 matrix where:
- Row 1: headers (first cell empty, then first letter A–Z/Q(SCH)/X(CH))
- Each row: first cell = second letter, then words
- Empty cells are skipped
- Headers `Q (SCH)` and `X (CH)` are stored internally as `Q` and `X`

### 6. Start development server

```bash
npm run dev
```

Open http://localhost:3000 and log in with your seeded credentials.

## Deployment on Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Vercel will auto-deploy on push

To run scripts against the production DB locally:

```bash
DATABASE_URL=<prod-url> npm run seed
DATABASE_URL=<prod-url> npm run import -- --file path/to/file.csv
```

## Keyboard shortcuts (Training mode)

| Key | Action |
|-----|--------|
| Space / Enter | Reveal answer |
| 1 | Rate: Sofort (Instant) |
| 2 | Rate: Langsam (Slow) |
| 3 | Rate: Fail |
| D | Toggle "Zeit verwerfen" (discard time) |

**Confusion dialog:**
| Key | Action |
|-----|--------|
| 1 | Blackout / no word |
| 2 | Confused with other pair |
| 3 | Wrong word |
| 4 / Esc | Skip |

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Neon/Postgres via `@neondatabase/serverless`
- **ORM**: Drizzle ORM
- **Auth**: iron-session (cookie-based)
- **Images**: Vercel Blob
- **Charts**: Recharts
