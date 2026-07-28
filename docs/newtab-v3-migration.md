# Техдолг по миграции newtab на v3

## Статус

Основная миграция завершена.

Сейчас `newtab` работает с `SpaceV3[]` как с основным runtime-форматом:

- state и reducer работают с `SpaceV3[]`
- storage читает старые данные через явную нормализацию и сохраняет только `v3`
- export строится из реального `v3`
- preload, sidebar, topbar, settings, bookmarks, folder и item UI-path больше не используют global legacy-view
- `legacyAppStateView` удалён из runtime

## Что было закрыто

1. Убран lossy round-trip `v3 -> legacy -> v3` из mutation path в `src/newtab/state/actionHelpers.ts`.
2. Починен cross-space `MoveFolder`, чтобы перенос папок не повреждал `group` и `collapsed`.
3. Добавлена явная миграция/нормализация storage-load в `src/newtab/state/storage.ts`.
4. Export переведён на реальный `DataBackupV3` в `src/newtab/helpers/importExportHelpers.ts`.
5. Preload и runtime read-path переведены на `v3`-traversal helper-ы.
6. UI-слой переведён с `AppStateLegacyView` на `AppState`/`SpaceV3[]`.
7. Добавлены тесты на:
   - lossy legacy round-trip
   - `group` / `groupItems`
   - `collapsed`
   - storage migration
   - export без потери `v3`-структуры
   - cross-space move folder

## Что осталось как совместимость

Legacy-адаптеры сохраняются только для совместимости со старыми форматами данных:

- `src/newtab/helpers/dataFormatAdapters.ts`
- import-path, который умеет читать старые backup-форматы
- отдельные union-типизации в helper-ах, где это ещё нужно для мягкого перехода API/undo/network payload

Это уже не runtime source of truth и не mutation path.

## Итоговая цель

Поддерживаемый end-to-end формат: `DataBackupV3`.

Практический эталон: `docs/tech-debt/0204-1.json`.

Он должен:

- импортироваться без потери структуры
- корректно жить в runtime и storage
- экспортироваться обратно как `version: 3`
- сохранять `group`, `groupItems`, folder/group `collapsed` и `objectType`

## Оставшийся техдолг

Небольшой остаточный техдолг ещё есть:

- часть helper/API типов всё ещё допускает `LegacySpace[] | SpaceV3[]` для совместимости
- network payload типы исторически описаны через legacy-формы и могут быть упрощены отдельной задачей
- legacy-конвертеры стоит удалить полностью после окончания периода поддержки старых backup-форматов
- в item-модели `bookmark/group` сейчас дублируются `type` и `objectType`

### Отдельно: `type` vs `objectType`

Сейчас в `v3`-формате:

- `space` и `folder` различаются по `objectType`
- `bookmark` и `group` в runtime в основном различаются по `type`
- при этом в backup-файлах у item-ов часто присутствуют оба поля, где `objectType` фактически дублирует `type`

Например для item-ов встречаются пары:

- `type: "bookmark"` + `objectType: "bookmark"`
- `type: "group"` + `objectType: "group"`

Это создаёт лишнее дублирование и риск рассинхрона.

Желаемое состояние:

- оставить один discriminator для всего дерева данных
- предпочтительный кандидат: `objectType`, потому что он уже используется у `space` и `folder`

Но это отдельный рефакторинг, не включённый в текущую задачу про миграцию/сохранность `v3`.

Что потребуется в отдельной задаче:

1. Выбрать единое поле-дискриминатор.
2. Обновить `types.ts` и runtime-проверки.
3. Перевести helper-ы и UI с `item.type` на единое поле.
4. Обновить normalize/import/export path.
5. Сохранить backward compatibility для уже существующих backup-файлов.
