# Contributing to Mag's Obsidian Exporter

First off, thank you for considering contributing to the project! We welcome pull requests and issues.

## Local Development

The project is structured using Vite + TypeScript and utilizes Tailwind CSS.

### Setup

1. **Clone the repo**
   `git clone https://github.com/MagdielCAS/mag-obsidian-module.git`
   `cd mag-obsidian-module`

2. **Install dependencies**
   `npm install --legacy-peer-deps`

3. **Development Watch**
   `npm run build` (or run a vite watch via your own alias script)

4. **Testing**
   The project has unit tests driven by Vitest. Run the tests with:
   `npm run test`

## Architecture Decisions

- **Modularity:** To prevent the project from becoming a large, tightly-coupled monolithic file, the parsing rules and text transformers have been split into discrete functions (e.g., `htmlToMarkdown`, `createFrontmatter`, `convertLinks` located in `src/export/markdown.ts`).
- **Pure Functions:** We try to emphasize *testable, small, pure functions*. Avoiding complex global states inside utility classes makes writing Vitest unit tests vastly easier and protects the data transformation layer against side effects.
- **Frontend vs Build Tooling:** Tailwind handles UI styling through Vite’s lightning-fast ES module generation instead of typical Foundry CSS logic, meaning better DX and smaller bundle sizes in production.
- **Zip Handling:** JSZip acts as the focal aggregator. We create an in-memory virtual filesystem resembling the Foundry database (`src/export/Exporter.ts`) before streaming the blob payload entirely client-side.

Please make sure to write unit tests for new features where possible!
