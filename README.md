# Tablo

Tablo is a Chrome extension that replaces the default New Tab page with a personal bookmark dashboard. It helps you organize links and quickly access browser activity without leaving the page.

## Features

- Organize bookmarks into spaces, folders, and groups.
- Create, edit, move, and delete bookmarks and folders with drag and drop.
- Search bookmarks and select multiple items for bulk actions.
- View open tabs and recent browser history in the sidebar.
- Switch between light, dark, and automatic themes.
- Import and export dashboard or individual-space backups as JSON.
- Keep application data locally in Chrome storage.
- Undo the latest dashboard changes.

## Requirements

- Google Chrome or another Chromium-based browser.
- Node.js and npm.

## Install and run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development build in watch mode:

   ```bash
   npm run watch
   ```

3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the project's `dist` directory.

Webpack updates `dist` after source changes. To apply an update in Chrome, click the extension's reload button on `chrome://extensions`.

## Production build

Create an optimized build:

```bash
npm run build
```

When the command completes, select the `dist` directory through **Load unpacked** in `chrome://extensions`.

## Available commands

| Command | Description |
| --- | --- |
| `npm run watch` | Build in development mode and rebuild on file changes. The extension replaces the New Tab page. |
| `npm run watch2` | Build in development mode without replacing the New Tab page. |
| `npm run build` | Run TypeScript checks and create an optimized production build in `dist`. |
| `npm run typecheck` | Run TypeScript type checks without creating build files. |
| `npm test` | Run the test suite. |
| `npm run clean` | Remove the `dist` build directory. |
