# Zustand: итоговая архитектура состояния Tablo

Этот документ фиксирует переход от единого Redux-подобного reducer к Zustand. Он нужен как учебная карта: где теперь живёт состояние, куда добавлять новую логику и какие границы не стоит нарушать.

## Короткий итог

В проекте больше нет единого `AppState`, `Action`, `dispatcher` и reducer. Вместо них есть три маленьких Zustand store с разной ответственностью:

```text
React-компоненты
  ├─ dashboardStore       данные дашборда пользователя
  ├─ uiStore              состояние и настройки интерфейса
  └─ chromeRuntimeStore   временные данные браузера Chrome

Контроллеры вне store
  ├─ storage-sync         загрузка, сохранение и синхронизация Chrome Storage
  ├─ chrome-runtime       Chrome API, listeners и время жизни подписок
  └─ themeController      применение темы к DOM
```

Store отвечает за изменение данных. Внешние API, DOM, таймеры, подписки и сохранение живут рядом, но отдельно.

## Как было раньше

Раньше приложение строилось вокруг одного состояния и одного потока команд:

```text
Компонент
  → dispatch(Action)
  → stateReducer(AppState, Action)
  → новый AppState
  → компонент получает весь AppState через props/context
```

Вокруг reducer существовали `actions.ts`, `state.ts`, `storage.ts`, `actionHelpers.ts` и `runtimeActionBridge.ts`.

### Что лежало в старом AppState

В одном объекте смешивались четыре разных вида данных:

| Вид данных | Примеры |
| --- | --- |
| Данные дашборда | spaces, folders, bookmarks, выбранный space |
| UI | поиск, открытое меню, редактируемый элемент, notification |
| Настройки | тема, свёрнутый sidebar, фильтры отображения |
| Runtime Chrome | открытые вкладки, recent tabs, id окна, история активных вкладок |

Это работало, но усложняло развитие. Например, компоненту Sidebar часто передавался весь `AppState`, хотя ему нужны были только несколько полей. А изменение данных Chrome могло быть похоже на изменение закладки, хотя у этих данных разный жизненный цикл и разные способы сохранения.

### Главные ограничения старого подхода

1. **Слишком широкий контракт.** `AppState` становился центром всего приложения. Изменение его формы затрагивало много компонентов.
2. **Нечёткая ответственность.** Reducer, action helpers, storage и Chrome bridge вместе образовывали один большой механизм, в котором было трудно понять владельца конкретного эффекта.
3. **Слабая типизация действий.** Универсальные действия и обновления состояния скрывали смысл операции. По коду хуже видно, что именно меняется.
4. **Лишние перерисовки и связи.** Компоненты зависели от широкого объекта, а не от минимального набора данных.
5. **Труднее тестировать.** Чистая логика дашборда была переплетена с browser API, storage и диспетчеризацией.

Это не означает, что reducer был «неправильным». Такой подход полезен для изучения однонаправленного потока данных. Но при росте интерфейса ему потребовалось разделение обязанностей.

## Как стало

### 1. `dashboardStore`: доменные данные дашборда

Папка: `src/newtab/state/dashboard/`.

Здесь находятся spaces, папки, bookmarks, текущий выбранный space и undo-снимки. Это пользовательские данные, которые нужно сохранять.

```text
dashboard/
  types.ts           модели предметной области
  domain.ts          чистые функции изменения spaces
  itemUtils.ts       чистые конвертеры и поиск item
  selectors.ts       переиспользуемые выборки
  dashboardStore.ts  Zustand store и его действия
```

`domain.ts` не знает ни о React, ни о Zustand, ни о Chrome. Его можно тестировать как обычные функции: передать spaces, получить новые spaces.

Пример смыслового действия store:

```ts
dashboardStore.getState().renameSpace(spaceId, title);
```

Это лучше, чем отправлять обобщённое действие наподобие `dispatch({ type: 'Update...' })`: вызов сам объясняет намерение.

### 2. `uiStore`: интерфейс и пользовательские предпочтения

Папка: `src/newtab/state/ui/`.

Он хранит два близких, но разных класса данных:

| Класс | Примеры | Сохраняется |
| --- | --- | --- |
| Предпочтения | тема, collapsed sidebar, фильтры показа | Да |
| Временное UI-состояние | строка поиска, меню, notification, редактирование | Нет |

Такое разделение важно: открытое меню или временное уведомление не должны внезапно восстановиться после перезапуска вкладки.

Примеры действий:

```ts
useUiStore((state) => state.setSearch)(query);
useUiStore((state) => state.showNotification)(message);
useUiStore((state) => state.setColorTheme)(theme);
```

### 3. `chromeRuntimeStore`: временный снимок Chrome

Папка: `src/newtab/state/chrome-runtime/`.

Он содержит вкладки, recent tabs, текущий window id, последние активные tab id и флаг первоначальной загрузки. Эти данные принадлежат браузеру, а не пользователю: их нельзя сохранять как часть дашборда.

Контроллер в `chrome-runtime/controller.ts` читает Chrome API и подписывается на события. Затем он передаёт уже полученные данные в store. Store сам Chrome API не вызывает.

```text
Chrome tabs API / Chrome events
  → chrome runtime controller
  → chromeRuntimeStore.setTabs(...)
  → React selector
```

### 4. `storage-sync`: граница с постоянным хранилищем

Папка: `src/newtab/state/storage-sync/`.

`chromeStorageAdapter.ts` знает о `chrome.storage` и BroadcastChannel. `controller.ts`:

1. загружает сохранённые данные при старте;
2. гидратирует dashboard и UI store;
3. подписывается на нужные поля store;
4. сохраняет только persistable-данные с throttling;
5. синхронизирует изменения между новыми вкладками.

Store не пишет в storage сам. Благодаря этому он остаётся предсказуемым и может работать в тесте без Chrome.

### 5. `themeController`: граница с DOM

Тема хранится как preference в `uiStore`, но CSS-класс/атрибут на странице выставляет отдельный controller. Это тот же принцип: состояние отдельно, побочный эффект отдельно.

## Почему используется vanilla Zustand

Вместо `create(...)` для React используется два шага:

```ts
const dashboardStore = createStore<DashboardStore>()((set, get) => ({
  // state и действия
}));

export const useDashboardStore = <T>(selector: (state: DashboardStore) => T) =>
  useStore(dashboardStore, selector);
```

`createStore` создаёт обычный независимый JavaScript store. Он не привязан к React.

`useStore(store, selector)` — тонкий React-адаптер: подписывает компонент только на результат selector.

Это даёт два способа работы с одними данными:

```ts
// В React-компоненте: подписка и перерисовка только при изменении выбранного значения.
const spaces = useDashboardStore((state) => state.spaces);

// В controller, keyboard handler или тесте: чтение/команда без React.
dashboardStore.getState().createSpace(title);
```

Это особенно удобно для расширения Chrome: controllers существуют вне React, но используют тот же store без искусственного Context или dispatcher.

## Аналогия с RTK

Zustand не является «Redux без reducer». Модель проще, но аналогии полезны:

| В RTK | В текущем Zustand-подходе |
| --- | --- |
| `configureStore` | отдельные vanilla stores по зонам ответственности |
| slice state | поля `DashboardStore`, `UiStore`, `ChromeRuntimeStore` |
| reducer/case reducer | именованный метод store, часто использующий функцию из `domain.ts` |
| action creator + `dispatch` | прямой вызов `store.getState().renameSpace(...)` |
| `useSelector` | `useDashboardStore(selector)` |
| middleware/listener | controller около нужной интеграции |
| Redux DevTools | возможно подключить middleware Zustand при необходимости |

Ключевое различие: в RTK изменение обычно выражается объектом action и проходит через reducer. В Zustand действие — обычный метод store. Поэтому дисциплина именования и границ здесь важнее: библиотека не заставляет держать архитектуру за нас.

## Что стало лучше

1. **У каждого состояния есть владелец.** Данные дашборда, UI и Chrome runtime больше не конкурируют внутри `AppState`.
2. **Компоненты читают узко.** Вместо `AppState` props они берут только нужное через selector.
3. **Чистая логика изолирована.** Операции с spaces/folders/items тестируются без React, Chrome и storage.
4. **Побочные эффекты видны.** Если есть Chrome API, storage, DOM или listener, искать надо в controller/adapter, а не в store.
5. **Сохранение контролируемо.** Persisted-модель задана явно; runtime и временный UI не попадают в storage.
6. **Undo стал локальным для дашборда.** Перед доменной операцией dashboard store сохраняет снимок, а не передаёт id истории через общую цепочку actions.
7. **Удалён legacy слой.** `actions.ts`, `state.ts`, reducer, storage bridge и старые совместимые contracts больше не поддерживаются.

## Правило выбора места для новой логики

Перед добавлением поля или функции ответь на вопросы в указанном порядке.

1. Это данные пользователя о дашборде: space, folder, bookmark, порядок, выбранный space?
   - Добавляй в `dashboard`.
2. Это визуальное состояние или preference интерфейса?
   - Добавляй в `ui`.
3. Это данные, которыми владеет Chrome и которые исчезнут после закрытия вкладки?
   - Добавляй в `chrome-runtime`.
4. Это обращение к Chrome API, storage, BroadcastChannel, DOM, timer или listener?
   - Это controller/adapter/helper вне store.
5. Это преобразование данных без побочных эффектов?
   - Это чистая функция рядом с доменом, обычно `domain.ts` или `itemUtils.ts`.
6. Это серверные данные с кэшем, загрузкой и инвалидизацией?
   - Рассматривай TanStack Query, а не Zustand. В текущем расширении такого слоя пока нет.

## Как добавлять новую возможность

Например, нужно добавить настройку «компактный вид карточек».

1. Это preference интерфейса, значит поле `isCompactCards` живёт в `uiStore`.
2. Добавь явные методы `setCompactCards` или `toggleCompactCards`, а не универсальный `setState`.
3. Добавь поле в persisted-модель storage-sync, потому что preference должна пережить перезапуск.
4. Компонент читает только это поле:

```ts
const isCompactCards = useUiStore((state) => state.isCompactCards);
```

5. Напиши тест store/контроллера и проверь, что transient UI случайно не сериализуется вместе с preference.

Другой пример: нужно получать недавно закрытые вкладки. Это данные Chrome, поэтому Chrome API-запрос и listener идут в `chrome-runtime/controller.ts`, а результат — в `chromeRuntimeStore`. Их не нужно сохранять в storage.

## Практические правила для store

### Делай так

- Называй действия по намерению: `moveItem`, `deleteFolder`, `setSearch`, `hydrate`.
- В React используй узкие selectors.
- Держи вычисления, которые нужны нескольким местам, в `selectors.ts` или чистых helpers.
- Гидратируй состояние через явный метод store; не подменяй store произвольным объектом.
- Тестируй `domain.ts` отдельно от store, а controller — через adapter/mock.
- Для действий вне React используй `store.getState()` только на границе: controller, keyboard handler, тест, bootstrap.

### Не делай так

- Не вызывай `chrome.*`, `localStorage`, `chrome.storage`, `document`, `window`, `setTimeout` или `BroadcastChannel` из store/domain.
- Не возвращайся к единому `AppState` и `DispatchContext`.
- Не передавай весь store state в component props «на всякий случай».
- Не используй generic-методы вида `updateAppState(partial)` для бизнес-операций.
- Не сохраняй в storage tabs, notifications, open menu, текущий поиск и undo stack.
- Не читай весь store через `useDashboardStore((state) => state)`: это снова создаст широкую зависимость.

## Какие данные сохраняются

| Область | Сохраняется | Почему |
| --- | --- | --- |
| Dashboard: spaces и выбранный space | Да | Пользовательские данные |
| UI preferences | Да | Пользователь ожидает восстановление настроек |
| Временный UI | Нет | Это состояние конкретного экрана/сессии |
| Chrome runtime | Нет | Источник истины — браузер |
| Undo snapshots | Нет | История актуальна только для текущей вкладки |

## Проверка удаления legacy слоя

Тест `src/__tests__/legacyStateRemoval.contract.test.ts` — это removal contract. Он намеренно проверяет, что удалённые legacy-файлы не вернулись и новый код их не импортирует.

Если в будущем захочется «быстро починить» что-то возвращением `actions.ts` или общего reducer, этот тест должен остановить такое изменение. Правильнее перенести недостающую чистую функцию в доменный слой или добавить действие в соответствующий store.

## Как проверять изменения

После изменения состояния или controller запускай:

```bash
npm run typecheck
npm test -- --runInBand
npm run build
```

Для интерактивной проверки расширения:

```bash
npm run watch
```

Сборка должна завершиться сообщением `webpack compiled successfully`. Ошибка `EMFILE: too many open files, watch` при длительном запуске watch относится к лимиту файловых дескрипторов среды наблюдения, а не к ошибке TypeScript/webpack-компиляции.

## Итоговая ментальная модель

```text
Данные и команды             Zustand store
Чистые преобразования        domain/helper
Внешний мир                  controller/adapter
Отрисовка                    React selector
Серверный кэш                TanStack Query (если появится)
```

Если сохранять эту границу, Zustand останется маленьким и понятным, а не превратится в новый `AppState` под другим названием.
