<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Data Model: Cultural Orientation

The backend uses two main Supabase tables:

### `cultural_orientation_profiles`

Stores one onboarding profile per demo user.

This table represents the user’s cultural orientation preferences and personalization context.

Fields:
- `id`: UUID primary key
- `user_id`: text ID from localStorage/demo user, unique
- `origin_country`: where the user is coming from
- `destination_country`: where the user is adapting to
- `language_level`: general language comfort level in the destination language
- `priority_topics`: array of cultural topics the user wants help with
- `preferred_learning_style`: how the user prefers to learn
- `wants_help_with`: array of daily-life situations the user wants guidance on
- `avoid_topics`: optional sensitive topics to avoid
- `saved_modules`: array of saved cultural module IDs
- `created_at`, `updated_at`: timestamps

No real auth is required for the demo. `user_id` should come from localStorage on the frontend.

### `cultural_orientation_modules`

Stores cultural orientation learning modules.

Each module has:
- `id`: UUID primary key
- `title`: module title
- `topic`: one cultural topic only
- `text`: main module content
- `created_at`, `updated_at`: timestamps

Each module belongs to exactly one topic.

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

