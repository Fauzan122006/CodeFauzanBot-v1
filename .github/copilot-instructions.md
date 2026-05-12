# GitHub Copilot Instructions — CodeFauzanBot-v1

## 1. Project Overview
- Name: CodeFauzanBot-v1
- Description: Discord bot with web dashboard for server management, moderation, leveling, music, achievements, and social integrations.
- Goal: Provide an all-in-one Discord community management bot that can be configured from both slash commands and a browser dashboard.
- Target Users: Discord server owners, admins, moderators, and community members.
- Version: v1.1.0
- Status: Active development

## 2. Tech Stack
- Language: JavaScript (Node.js, CommonJS)
- Bot Framework: discord.js v14
- Web Framework: Express + EJS
- Auth: Passport.js + passport-discord (OAuth2)
- Music: DisTube + @discordjs/voice + ffmpeg-static
- Database / Persistence: better-sqlite3 (`database/userData.db` for user stats, `database/botData.db` for bot configuration/state)
- Image/Card Rendering: canvas + @napi-rs/canvas + sharp + fontkit
- Package Manager: npm
- Deployment: VPS / Pterodactyl / Docker Compose

## 3. Commands
```bash
# Development / Runtime
npm install
npm start
node index.js
npm run rebuild

# Docker
docker compose up -d --build
docker compose logs -f

# Deployment helper scripts
node deploy-commands.js
node deploy-guild-commands.js
```

Rules:
- Always use `npm` for package operations.
- Do not use `yarn`, `pnpm`, or `bun` in this repository.
- Do not assume `lint`, `build`, or automated test scripts exist unless they are added to `package.json`.

## 4. Project Structure
Architecture: Event-driven Discord bot + command modules + Express dashboard (modular by responsibility).

```text
/
├── index.js                    # Main bot entry point
├── dashboard.js                # Express dashboard app
├── commands/                   # Slash command modules
├── events/                     # Discord event handlers
├── middleware/                 # Express auth/permission middleware
├── utils/                      # Shared helpers (data, leveling, achievements, music)
├── views/                      # EJS dashboard templates
├── botconfig/                  # Main config + per-server settings
├── database/                   # Runtime data storage
├── asset/                      # Static assets served by dashboard
├── fonts/                      # Font files for generated cards
├── deploy-commands.js          # Global slash command deploy script
├── deploy-guild-commands.js    # Guild slash command deploy script
└── docker-compose.yml          # Container deployment config
```

Placement rules:
- New slash commands go in `commands/`.
- New Discord event handlers go in `events/`.
- Shared business logic goes in `utils/`.
- Dashboard route/middleware logic stays in `dashboard.js` and `middleware/`.
- Dashboard templates belong in `views/`.
- Do not create new top-level folders without explicit confirmation.

## 5. Naming Conventions
- Command files: lowercase kebab-case when needed (example: `set-level.js`, `my-achievements.js`).
- Event files: camelCase (example: `interactionCreate.js`, `guildMemberAdd.js`).
- Utility files: camelCase (example: `dataManager.js`, `levelUpHandler.js`).
- Variables/functions: camelCase.
- Constants: UPPER_SNAKE_CASE.
- Keep command names aligned with slash command names.

## 6. Code Conventions
- Follow clean code and DRY principles.
- Use CommonJS (`require`, `module.exports`) to match existing codebase style.
- Prefer small, focused modules and reuse logic from `utils/`.
- Keep async flows explicit with `async/await`.
- Handle errors explicitly with informative logs/messages.
- Do not silently swallow important runtime errors.

Import order:
1. External packages
2. Internal modules (`./`, `../`)
3. Local constants/helpers

Export pattern:
- Keep existing `module.exports = { ... }` style.

## 7. Component/Module Rules
- Slash command modules must export:
  - `data` (`SlashCommandBuilder`)
  - `execute(interaction)` async function
- Event modules must export:
  - `name`
  - `execute(...)`
  - optional `once`
- Middleware modules export focused functions (example: `ensureAuthenticated`, `ensureAdmin`).
- If logic is reused by multiple commands/events, move it into `utils/`.

## 8. Styling Rules
- Dashboard views use EJS templates from `views/`.
- Reuse existing class naming and layout patterns from existing templates.
- Prefer consistent styling patterns over introducing new style systems.
- Do not introduce a new CSS framework without explicit approval.

## 9. API & Data Fetching Rules
- Keep route handlers and response behavior consistent in `dashboard.js`.
- Validate/guard user permissions for guild-scoped actions.
- Use environment variables for credentials, URLs, and secrets.
- Never hardcode API keys, client secrets, or tokens.
- Keep third-party API calls wrapped in proper error handling.

## 10. State Management Rules
- Runtime bot state is primarily:
  - Discord client cache
  - Config/state in `botconfig/`
  - User/runtime data via `utils/` and `database/`
- Prefer existing data access helpers (`utils/dataManager`, user data handlers) over ad-hoc file access.
- Avoid duplicating the same state in multiple places unless required.

## 11. Performance Rules
- Avoid expensive per-message/per-interaction operations in hot paths.
- Use cache-first patterns where already used by the project.
- Keep intervals/timers controlled and necessary.
- Minimize blocking filesystem operations in frequently called code paths.

## 12. Git Rules
- Use focused commits for one logical change.
- Commit message format:
  - `feat: ...`
  - `fix: ...`
  - `refactor: ...`
  - `docs: ...`
  - `chore: ...`
- Never commit secrets (`.env`, tokens, client secrets, API keys).
- Do not bundle unrelated changes into one commit.

## 13. Features
Completed / existing:
- [x] Discord OAuth dashboard
- [x] Slash command system
- [x] Moderation commands and automod settings
- [x] Leveling and rank system
- [x] Achievement system
- [x] Role management and rules acceptance flow
- [x] Music system (YouTube/Spotify/SoundCloud) with interactive controls
- [x] YouTube social posting integration

## 14. Testing
- Current approach: primarily manual/runtime verification.
- No reliable automated test suite is configured yet.
- When changing logic, prioritize validating:
  - command execution flow
  - event handling behavior
  - dashboard auth + permission paths
  - config/data read-write integrity

## 15. Do Not
- If requirements are ambiguous, ask before implementing major changes.
- Do not create, move, or delete major folders/files without confirmation.
- Do not introduce a different module system (ESM migration) without approval.
- Do not install new dependencies unless required and approved.
- Do not refactor unrelated modules while fixing a scoped issue.
- Do not expose secrets or sensitive config in logs, responses, or committed files.
- Do not run destructive production data operations.

## 16. Environment Variables
Setup:
- Copy `.env.example` to `.env` for local/dev deployments.
- Never commit `.env`.

Common variables in this project:
- `CLIENT_TOKEN` — Discord bot token (server-only)
- `CLIENT_NAME` — Bot display name/config value
- `CLIENT_SECRET` — Discord OAuth client secret (server-only)
- `CLIENT_ID` — Discord OAuth client ID
- `CALLBACK_URL` — OAuth callback URL
- `SESSION_SECRET` — Express session secret (server-only)
- `TESTING_SERVER_ID` — Test guild ID
- `PREFIX` — Legacy/custom prefix config
- `DEVELOPER_ID` — Developer IDs JSON array
- `SPOTIFY_CLIENT_ID` — Spotify integration ID
- `SPOTIFY_CLIENT_SECRET` — Spotify integration secret (server-only)
- `SPOTIFY_REFRESH_TOKEN` — Spotify refresh token (server-only)
- `YOUTUBE_API_KEY` — YouTube API key (server-only)
- `YOUTUBE_CHANNEL_ID` — YouTube channel target
- `COLOR_THEME_CODE` — Theme color config
- `TOPGG` — top.gg token (server-only)
- `PORT` — Dashboard HTTP port (default 3000)

Security rule:
- Treat all secrets/tokens as server-only even if not prefixed.
