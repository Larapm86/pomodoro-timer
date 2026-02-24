# Pomodoro Timer

A focus/break timer with multiple themes. Set work and break durations, track progress by minute, and switch modes or themes from the UI.

## Features

- **Focus & break modes** — Switch between focus and break; durations are configurable in Settings (Standard toggle, presets, and custom minutes).
- **Long break after 4 focus sessions** — After 4 completed focus sessions, the next break is automatically 15 minutes; the cycle then resets.
- **Themes** — Minimal, Cherry, Cherryverse, and Retro with distinct colors and typography; choice is saved in `localStorage`.
- **Sound** — Optional sound when switching focus ↔ break; toggle in the top bar.
- **Persistence** — Focus and break durations and theme are stored in `localStorage` and restored on reload.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL shown in the terminal (e.g. `http://localhost:5173` or `http://localhost:5176`).

## Scripts

| Script            | Description                     |
|-------------------|---------------------------------|
| `npm run dev`     | Start dev server with HMR       |
| `npm run build`   | Production build to `dist/`    |
| `npm run preview` | Preview production build       |
| `npm run lint`    | Run ESLint on source            |

## Themes

| Theme         | Description                                           |
|---------------|-------------------------------------------------------|
| **Minimal**   | Teal/slate, clean layout                              |
| **Cherry**    | Warm cream/brown, red accents, progress as circles    |
| **Cherryverse** | Dark green matrix style, scanlines                  |
| **Retro**     | Pixel / Tetris-style grid, cyan/gold                  |

Theme choice is persisted in `localStorage`.
