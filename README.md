# Pomodoro Timer

A focus/break timer with multiple themes. Set your work and break durations, track progress by minute, and switch modes or themes from the UI.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL shown in the terminal (e.g. `http://localhost:5173`).

## Scripts

| Script     | Description                |
|-----------|----------------------------|
| `npm run dev`     | Start dev server with HMR  |
| `npm run build`   | Production build to `dist/` |
| `npm run preview` | Preview production build   |
| `npm run lint`    | Run ESLint on source       |

## Themes

| Theme       | Description                    |
|------------|--------------------------------|
| **Minimal** | Teal/slate, clean layout       |
| **Cherry**  | Warm cream/brown, red accents, progress as circles + leaf |
| **Cherryverse** | Dark green matrix style, scanlines |
| **Retro**   | Pixel / Tetris-style grid, cyan/gold |

Theme choice is persisted in `localStorage`.

## Recent changes

- Four themes: Minimal, Cherry, Cherryverse, Retro (Cherry renamed from Tomato).
- CTA hierarchy: primary (Start/Pause), secondary (Reset, Switch to focus/break), tertiary (Start break now / Start focus now) with theme-appropriate styles.
- Progress circles per minute; Cherry theme uses red fill + green leaf when complete.
- Timer hover states improved for Minimal and Cherryverse (visible background + color).
- Mode switch (focus ↔ break) transitions smoothed (body, card, buttons, circles).
- Accessibility: focus rings, aria-labels, theme switcher keyboard support, contrast fixes for secondary hover in Cherry focus mode.
