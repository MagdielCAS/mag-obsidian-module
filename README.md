# Mag's Obsidian Exporter

A comprehensive module for [Foundry Virtual Tabletop](https://foundryvtt.com/) that exports your world's Journals, Actors, and related Assets into a deeply integrated and structured **Obsidian Vault**.

## Features

- **Whole World Export:** Safely zip and export your entire game database to your local machine.
- **Journal & Actor Support:** Flawlessly transitions formatted HTML pages and descriptive character sheets into crisp, Obsidian-ready Markdown.
- **UUID to Wikilinks Conversion:** Keeps all internal references intact by securely converting Foundry `@UUID[...]` identifiers to familiar `[[Wikilinks]]`.
- **Integrated Asset Bundling:** Downloads profile images, maps, and embedded markdown graphics directly, wrapping them cleanly into relative `/Assets` directories within the target zipped structure.
- **Frontmatter Tagging:** Extracts specific Foundry meta-data and system attributes natively into YAML frontmatter properties (`---`).

## Installation

You can install this module by pasting the following Manifest URL into the **Add-on Modules** menu in Foundry VTT:
```
https://github.com/MagdielCAS/mag-obsidian-module/releases/latest/download/module.json
```
*(Note: Replace with the actual URL once a release is published)*

## Usage

1. Go to your Game Settings tab.
2. Click the new **Export to Obsidian** button.
3. Configure your export preferences.
4. Let the export process bundle everything. A `.zip` download will begin automatically containing the completely functional Obsidian Vault.

## Architecture & Codebase

This module heavily prioritizes testable and composable code, heavily separating parsing algorithms (HTML-to-Markdown, UUID mapping, zip structuring) into pure utility functions allowing solid Vitest reliability. Vite compiles and minifies the TS/Tailwind UI elements into a tiny lightweight bundle.
