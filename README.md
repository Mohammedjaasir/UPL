# Miella Super League — Player Registration

Mobile-first, three-step player registration (Personal Info → Profile → Review) built with
Vite, React 19 and TypeScript. No UI library; styling is plain CSS with design tokens in
`src/index.css`.

## Scripts

| Command             | What it does                                 |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Start the dev server                         |
| `npm run build`     | Type-check and build to `dist/`              |
| `npm test`          | Run unit + integration tests (Vitest, jsdom) |
| `npm run typecheck` | TypeScript only                              |
| `npm run lint`      | oxlint                                       |

## Supabase setup

Registrations are saved to Supabase: the photo goes to a private storage bucket and the
details to the `player_registrations` table.

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste `supabase/migrations/20261001000000_player_registrations.sql`
   and run it. It creates the table (with the same rules as the form, and jersey numbers
   unique), the private `player-photos` bucket, and insert-only security policies.
3. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` (Project Settings → API). Restart `npm run dev`.
4. On Vercel, add the same two variables under Project → Settings → Environment Variables
   and redeploy.

Until the variables are set, submitting shows "Registration is not open online yet" — the
app never pretends a registration was saved.

**Viewing registrations:** Supabase dashboard → Table Editor → `player_registrations`.
Photos are in Storage → `player-photos`, named `<registration id>.<ext>`. The website cannot
read registrations back (no SELECT policy), so players' details stay private.

## Structure

```
src/
  features/registration/
    RegistrationPage.tsx     step flow, history/back-button sync, focus management, submit
    useRegistrationForm.ts   form state, touched/errors, session draft (text fields only)
    validation.ts            pure, reusable validators + normalisers (unit tested)
    constants.ts / types.ts  options (villages, roles, sizes…), data model, limits
    steps.ts                 step definitions and which fields each step owns
    components/              Field, ChoiceGroup, PhotoUpload, JerseyNumberField, steps…
  services/
    registrationService.ts   saves to Supabase — the only place that talks to the backend
  lib/supabase.ts            Supabase client (from VITE_SUPABASE_* env vars)
supabase/migrations/         table, bucket and security policies (run once)
```

## Data saved

| Column            | Example / allowed values                                |
| ----------------- | ------------------------------------------------------- |
| `id`              | UUID (the player sees `MSL-` + its first 8 characters)  |
| `full_name`       | `Kasun Perera` (trimmed, single-spaced)                 |
| `date_of_birth`   | `2001-04-12` (not in the future)                        |
| `village`         | `miella` · `kirinda` · `yagasmulla`                     |
| `whatsapp_number` | `+94771234567` (Sri Lankan mobile 70–78)                |
| `playing_role`    | `batsman` · `bowler` · `all_rounder` · `wicket_keeper`   |
| `batting_style`   | `right` · `left`                                        |
| `jersey_size`     | `XS` · `S` · `M` · `L` · `XL` · `XXL` · `XXXL`           |
| `jersey_name`     | `PERERA` (A–Z, space, `.` `'` `-`; ≤ 12, uppercase)      |
| `jersey_number`   | `1`–`99` (several players may share a number)           |
| `photo_path`      | `<id>.jpg` in the `player-photos` bucket (≤ 5 MB)       |

A duplicate jersey number is reported on the Jersey Number field so the player can pick
another. Network failures, timeouts and server errors are shown with a retry; nothing is
reported as saved unless both the photo upload and the insert succeed.
