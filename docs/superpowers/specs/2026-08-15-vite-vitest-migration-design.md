# Миграция Tablo на Vite и Vitest

## Цель

Заменить Webpack и Jest/ts-jest на Vite и Vitest без изменения поведения Chrome-расширения, форматов дистрибутивов и состава тестов.

## Границы

- Включено: dev- и production-сборка, оба варианта манифеста, публикация ZIP-архивов, TypeScript-проверка, unit/DOM-тесты, воспроизводимая версия Node/npm.
- Исключено: e2e-тесты, CI, линтеры, git-хуки, изменения продуктового кода и архитектуры приложения.

## Архитектура сборки

Vite собирает два entry point: `src/newtab/01-app/index.tsx` в `js/newtab.js` и `src/background.ts` в `js/background.js`. Папка `public/` попадает в корень `dist/`, как сейчас. Vite нативно компилирует используемый классический React JSX; для SVG-компонентов используется `vite-plugin-svgr`. SCSS, CSS Modules и alias `@` сохраняются.

Команда `build:normal` использует `public/manifest-normal.json`, включает override новой вкладки и создаёт `dist/manifest.json`. Команда `build:overrideless` использует `public/manifest-overrideless.json` и создаёт такой же целевой файл без override. Обычная `build` остаётся псевдонимом normal-сборки. Скрипт публикации вызывает обе явные команды и создаёт ZIP-файлы из `dist` в прежнем формате.

## Тестирование

Vitest использует node-окружение по умолчанию и `happy-dom` для тестов, которым нужен DOM. Существующие тесты в `src/__tests__` сохраняют имена и проверяемое поведение. Jest, ts-jest и типы Jest удаляются после успешного переноса. E2E-тесты не добавляются.

## Команды и версии

Добавляются команды `test:watch` и `check`, где `check` последовательно запускает typecheck, тесты и production-сборку. Node.js и npm фиксируются в поле `volta` пакета. Форматирование не добавляется: текущий исходный код не соответствует единому Prettier baseline, а массовая правка находится вне границ миграции. Для установки зависимостей в документации используется `npm ci`.

## Проверка результата

Успешная миграция означает:

1. `npm run typecheck`, `npm test`, `npm run build`, `npm run build:overrideless` и `npm run check` завершаются успешно.
2. В обоих результатах сборки присутствуют `manifest.json`, `newtab.html`, `js/newtab.js`, `js/background.js` и стили.
3. `manifest.json` normal-сборки содержит `chrome_url_overrides.newtab`, а overrideless-сборки — нет.
4. `npm run publish` создаёт normal- и overrideless ZIP-архивы с обновлённой версией.
