# Amparo

Cultural orientation guidance tailored to your route, language comfort, and priorities.

Amparo helps immigrants and newcomers adapt to their destination country by generating personalized cultural orientation modules based on where they're coming from, where they're going, and what they need help with.

## Features

- **Personalized Onboarding** — Collects origin/destination countries, language level, priority topics, and learning style preferences
- **AI-Powered Module Generation** — Generates cultural guidance modules using Groq/Claude with real-time streaming
- **Starter Guides** — Pre-configured guides for greetings, public behavior, and communication norms
- **Chat Suggestions** — Ask questions and get AI-suggested cultural modules
- **Save & Favorites** — Bookmark generated modules for later reference
- **PWA Support** — Installable as a mobile app with offline-capable manifest

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **AI**: Groq API / Anthropic Claude
- **Styling**: Tailwind CSS 4
- **Runtime**: Bun

## Getting Started

### Prerequisites

- Node.js 20+ or Bun
- Supabase project with tables set up (see `AGENTS.md` for schema)

### Environment Variables

Create a `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI (at least one required)
GROQ_API=your-groq-api-key
CLAUDE=your-anthropic-api-key
CLAUDE_HAIKU=claude-3-haiku-20240307  # optional model override
```

### Install & Run

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
app/
├── _components/     # React components (home, onboarding, modules, chat)
├── api/             # API routes (profile, modules, chat, uuid)
├── onboarding/      # Onboarding flow page
├── modules/         # Module viewer page
├── profile/         # Profile settings page
└── dev/             # Development/debug tools

lib/
├── cultural-orientation.ts  # AI prompt templates
├── groq.ts                  # AI client (Groq/Claude)
├── supabase-profiles.ts     # Profile database helpers
├── supabase-jobs.ts         # Job database helpers
├── starter-modules.ts       # Pre-defined starter guide specs
└── onboarding.ts            # Onboarding form types/validation
```

## Color Scheme

| Token             | Hex       | Usage                          |
|-------------------|-----------|--------------------------------|
| `--regal-navy`    | `#0d3b66` | Primary text, headers          |
| `--lemon-chiffon` | `#faf0ca` | Background, cards              |
| `--royal-gold`    | `#f4d35e` | Primary actions, highlights    |
| `--sandy-brown`   | `#ee964b` | Secondary accents, hover       |
| `--tomato`        | `#f95738` | Errors and warnings only       |

## Deployment

Deploy to Vercel:

```bash
vercel
```

Set environment variables in the Vercel dashboard.

## License

Private project.
