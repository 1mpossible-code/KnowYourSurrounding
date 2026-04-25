<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Data Model: Cultural Orientation

The backend uses these Supabase tables:

### `cultural_orientation_profiles`

Stores one onboarding profile per demo user.

This table represents the user’s cultural orientation preferences and personalization context.

Fields:
- `id`: UUID primary key
- `user_id`: text ID from localStorage/demo user, unique (this is the stable id the frontend stores)
- `origin_country`: where the user is coming from
- `destination_country`: where the user is adapting to
- `language_level`: general language comfort level in the destination language
- `priority_topics`: array of cultural topics the user wants help with
- `preferred_learning_style`: how the user prefers to learn
- `wants_help_with`: array of daily-life situations the user wants guidance on
- `avoid_topics`: optional sensitive topics to avoid
- `saved_generation_job_ids`: UUID array of **completed** rows in `cultural_orientation_generation_jobs` the user favorited (not `cultural_orientation_modules` ids)
- `created_at`, `updated_at`: timestamps

No real auth is required for the demo. `user_id` should come from localStorage on the frontend.

**Profile API (by `user_id`):**
- `GET /api/profile/[userId]` — load profile; returns `{ profile }` with camelCase fields including `savedJobIds` (empty when no row yet; `profile.exists` is false until first save)
- `PATCH /api/profile/[userId]` — upsert onboarding fields only (does not replace favorites unless you omit them from merge; server merges with existing row)
- `POST /api/profile/[userId]/favorites` — body `{ "jobId": "<uuid>", "action": "add" | "remove" }` for favorites; `add` requires the job to exist and be `completed`

### `cultural_orientation_modules` (optional)

Legacy or curated catalog of reusable modules. **Product flows can rely entirely on generation jobs** (`cultural_orientation_generation_jobs`) plus profile `saved_generation_job_ids` for user-specific content—no need to write canonical modules unless you want a shared library.

Each module has:
- `id`: UUID primary key
- `title`: module title
- `topic`: one cultural topic only
- `text`: main module content
- `created_at`, `updated_at`: timestamps

Each module belongs to exactly one topic.

### `cultural_orientation_generation_jobs`

Stores AI generation jobs for highlighted text -> cultural orientation module workflows.

Use this table for durable polling/streaming job state. Completed rows hold `title`, `topic`, `final_text` (markdown), etc., and are what the UI should list as “generated modules” / history when combined with the client; favorites reference **`cultural_orientation_generation_jobs.id`**.

Fields:
- `id`: UUID primary key for the job
- `user_id`: optional demo user ID from localStorage
- `highlighted_text`: required source text selected by the user
- `context_text`: optional larger article/body context
- `profile_json`: optional JSON copy of personalization/profile input
- `status`: `queued`, `generating`, `completed`, or `failed`
- `progress`: integer 0-100
- `partial_text`: incrementally generated markdown during streaming
- `error_message`: nullable failure reason
- `module_id`: nullable UUID for the generated module payload
- `title`: nullable generated title
- `topic`: nullable generated topic, must use allowed topics when present
- `final_text`: nullable final markdown content
- `created_at`, `updated_at`: timestamps

Notes:
- This table is for generation lifecycle state, not frontend chat history.
- The backend must validate allowed topic/language/learning-style values before persisting profile-derived fields.
- For demo/dev flows, history rendering can stay in the frontend, but job durability should come from Supabase.

Allowed topics:
`greetings`, `public_behavior`, `communication`, `personal_space`, `time`, `work`, `school`, `gender`, `religion`, `dating`, `conflict`, `laws`, `money`, `food`, `clothing`, `digital`, `safety`, `healthcare`, `government`, `transit`.

Allowed language levels:
`none`, `basic`, `intermediate`, `advanced`, `fluent`.

Allowed learning styles:
`quick_rules`, `step_by_step`, `real_life_examples`, `scenario_practice`, `checklists`.

The backend should validate these values before writing to Supabase.

## Color Scheme

:root {
  --regal-navy: #0d3b66;
  --lemon-chiffon: #faf0ca;
  --royal-gold: #f4d35e;
  --sandy-brown: #ee964b;
  --tomato: #f95738;
}

### Usage

--regal-navy: primary text, headers, structure
--lemon-chiffon: background, cards
--royal-gold: primary actions, highlights
--sandy-brown: secondary accents, hover states
--tomato: errors and warnings only

