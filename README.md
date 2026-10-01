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

## Configuration

Copy `.env.example` to `.env` and set `VITE_REGISTRATION_API_URL`.
Until it is set, submitting shows "Registration is not open online yet" — the app never
pretends a registration was saved.

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
    registrationService.ts   API client — the only place that talks to the backend
```

## Backend contract

`POST {VITE_REGISTRATION_API_URL}` as `multipart/form-data`:

| Field            | Example / allowed values                              |
| ---------------- | ----------------------------------------------------- |
| `fullName`       | `Kasun Perera` (trimmed, single-spaced)               |
| `dateOfBirth`    | `2001-04-12` (ISO, not in the future)                 |
| `village`        | `miella` · `kirinda` · `yagasmulla`                   |
| `whatsappNumber` | `+94771234567` (E.164, Sri Lankan mobile 70–78)       |
| `playingRole`    | `batsman` · `bowler` · `all_rounder` · `wicket_keeper` |
| `battingStyle`   | `right` · `left`                                      |
| `jerseySize`     | `XS` · `S` · `M` · `L` · `XL` · `XXL` · `XXXL`         |
| `jerseyName`     | `PERERA` (A–Z, space, `.` `'` `-`; ≤ 12, uppercase)    |
| `jerseyNumber`   | `1`–`99`                                              |
| `playerPhoto`    | JPEG / PNG / WebP, ≤ 5 MB                             |

Responses the client understands:

- `2xx` → `{ "registrationId": "MSL-0042" }` (or `id`; body optional) → success screen
- `409` → `{ "field": "jerseyNumber", "message": "..." }` → duplicate shown on that field
- `400` / `422` → `{ "message": "...", "errors": { "<field>": "..." } }` → per-field errors
- `413` → photo too large
- anything else, network failure or 30 s timeout → error shown, user can retry
