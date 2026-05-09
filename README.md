# uoc-vd-pac3

Vite + React + TypeScript starter for scrollama-based scrollytelling.

## What’s included

- `scrollama` integration for step-driven story progression
- A sticky visual panel paired with narrative steps
- Responsive layout and reduced-motion support

## Getting started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## CI/CD

This repository now includes GitHub Actions workflows for:

- CI on pull requests and pushes to `main` via `.github/workflows/ci.yml`
- Automatic GitHub Pages deployment from `main` via `.github/workflows/pages.yml`

For deployment, configure the GitHub repository setting **Pages -> Build and deployment -> Source** to **GitHub Actions**.

Preview the production build:

```bash
npm run preview
```

## GitHub Pages

This project is configured for a GitHub Pages project site at:

`https://<your-github-username>.github.io/uoc-vd-pac3/`

If you rename the repository, update the `base` value in `vite.config.ts` to match the new repo name.

## Deployment notes

- Deployment is handled by `.github/workflows/pages.yml` on pushes to `main`.
- Keep asset and link paths relative to the Vite base so the app works correctly under the Pages subpath.

## Project structure

- `src/App.tsx` — scrollytelling layout and scrollama setup
- `src/main.tsx` — React entry point
- `src/styles.css` — global story styling
- `vite.config.ts` — Vite configuration
- `.github/workflows/` — CI and GitHub Pages workflows

## Next steps

Replace the placeholder story content in `src/App.tsx` with your own sections, visuals, and data.

