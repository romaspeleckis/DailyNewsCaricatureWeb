# Daily News Caricature Web

Public read-only gallery for DailyNewsCaricature. It displays the date, headline, saved summary, and caricature image from Supabase.

## Setup

1. Create the public repository variable `SUPABASE_ANON_KEY` with the Supabase **Publishable/anon** key.
2. Enable **Settings → Pages → GitHub Actions** if it is not already enabled.
3. Run the `Deploy public caricature page` workflow.

Only the Supabase project URL and Publishable/anon key are used in the browser. Never add `GEMINI_API_KEY`, `HF_TOKEN`, or `SUPABASE_SERVICE_ROLE_KEY` here.
