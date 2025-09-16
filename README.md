# Froll (Vanilla Web)

A lightweight HTML/CSS/JS clone of the Expo app.

## Setup

1) Serve the folder (any static server). Examples:
- VS Code Live Server
- Python: `python -m http.server 5173`
- Node: `npx serve .`

2) Visit the served URL (e.g., `http://localhost:5173`).

## Features
- Facts feed from Wikipedia (random or by topic, with search)
- No backend required; all data fetched client-side from Wikipedia
- Clean, animated UI with staggered cards and smooth interactions

## Notes
- Ensure the Supabase project has tables: `flashcard_sets`, `flashcards` (as per the Expo app schema).
- For OAuth, configure Redirect URLs to your local server origin.

