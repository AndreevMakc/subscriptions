# SubsKeeper

SubsKeeper is a React 18 + Vite + TypeScript application for tracking personal and team subscriptions entirely in the browser. All data is persisted in `localStorage` so the experience stays fully functional offline.

## Getting started

```bash
npm install
npm run dev
```

The app will be available at [http://localhost:5173](http://localhost:5173).

Additional scripts:

- `npm run build` – compile the production bundle
- `npm run preview` – preview the production build locally
- `npm run lint` – run ESLint over the project

## Highlights

- Gradient glassmorphism UI styled with Tailwind CSS
- Zustand store with versioned persistence (`localStorage["subskeeper:v1"]`)
- React Router pages for dashboard, subscriptions, archive, settings, and editor
- Subscription analytics: monthly totals, sparkline, multi-currency USD normalisation
- Reminder centre with snooze support and dynamic expiry detection
- Import/Export to JSON plus demo data seeding on first run
- Forms powered by `react-hook-form` + `zod` with accessible validation messages
- 100% offline: no backend or external API calls required

## Project structure

```
src/
  components/   # Shared UI components
  pages/        # Router pages
  store/        # Zustand store and persistence
  types/        # Shared TypeScript types
  utils/        # Date, money, and filtering helpers
```

Feel free to customise copy, visuals, or extend integrations to match your product needs.
