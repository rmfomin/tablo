import type { FolderV3, GroupV3, ItemV3, SpaceV3 } from "@/newtab/05-entities/dashboard/model/types";

const favicon = (letter: string, color: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${color}"/><text x="16" y="22" text-anchor="middle" font-family="Arial" font-size="19" fill="white">${letter}</text></svg>`)}`;

function bookmark(id: number, title: string, url: string, letter: string, color: string) {
  return {
    id,
    position: `${id * 1024}`,
    type: "bookmark" as const,
    objectType: "bookmark" as const,
    title,
    url,
    favIconUrl: favicon(letter, color),
  };
}

function group(id: number, title: string, items: GroupV3["groupItems"]): GroupV3 {
  return {
    id,
    position: `${id * 1024}`,
    type: "group",
    objectType: "group",
    title,
    groupItems: items,
  };
}

type FolderSeed = {
  title: string;
  columnSpan: 1 | 2 | 4;
  items: ItemV3[];
  color?: string;
};

function createFolders(folderIdStart: number, seeds: FolderSeed[]): FolderV3[] {
  return seeds.map((seed, index) => ({
    id: folderIdStart + index * 100,
    position: `${(index + 1) * 1024}`,
    objectType: "folder",
    title: seed.title,
    columnSpan: seed.columnSpan,
    color: seed.color,
    items: seed.items,
  }));
}

const workFolders = createFolders(1000, [
  {
    title: "Старт дня",
    columnSpan: 1,
    color: "#dce9ff",
    items: [
      bookmark(1001, "Почта", "https://mail.google.com/", "G", "#ea4335"),
      bookmark(1002, "Календарь", "https://calendar.google.com/", "C", "#4285f4"),
      bookmark(1003, "Задачи на день", "https://linear.app/", "L", "#5e6ad2"),
    ],
  },
  {
    title: "Tablo",
    columnSpan: 2,
    items: [
      bookmark(1101, "Исходный код", "https://github.com/rmfomin/tablo", "G", "#24292f"),
      bookmark(1102, "Issues проекта", "https://github.com/rmfomin/tablo/issues", "I", "#24292f"),
      bookmark(1103, "Действия CI", "https://github.com/rmfomin/tablo/actions", "A", "#24292f"),
      group(1190, "Документация", [
        bookmark(1104, "React", "https://react.dev/", "R", "#087ea4"),
        bookmark(1105, "TypeScript", "https://www.typescriptlang.org/", "T", "#3178c6"),
      ]),
    ],
  },
  {
    title: "Разработка",
    columnSpan: 1,
    items: [
      group(1290, "Frontend", [
        bookmark(1201, "React Docs", "https://react.dev/", "R", "#087ea4"),
        bookmark(1202, "Vite", "https://vite.dev/", "V", "#646cff"),
        bookmark(1203, "MDN", "https://developer.mozilla.org/", "M", "#343a40"),
      ]),
      group(1291, "Backend", [
        bookmark(1204, "Node.js", "https://nodejs.org/", "N", "#43853d"),
        bookmark(1205, "PostgreSQL", "https://www.postgresql.org/docs/", "P", "#336791"),
      ]),
    ],
  },
  {
    title: "Документы и заметки",
    columnSpan: 4,
    color: "#eee7ff",
    items: [
      bookmark(1301, "План проекта", "https://docs.google.com/", "D", "#4285f4"),
      bookmark(1302, "База знаний", "https://www.notion.so/", "N", "#222222"),
      bookmark(1303, "Технические заметки", "https://keep.google.com/", "K", "#fbbc04"),
      bookmark(1304, "Доска команды", "https://miro.com/", "M", "#ffd02f"),
      bookmark(1305, "Словарь API", "https://swagger.io/tools/swagger-ui/", "S", "#85ea2d"),
    ],
  },
  {
    title: "Команда",
    columnSpan: 2,
    items: [
      bookmark(1401, "Slack", "https://slack.com/", "S", "#611f69"),
      bookmark(1402, "Видеовстречи", "https://meet.google.com/", "M", "#00897b"),
      bookmark(1403, "Контакты", "https://contacts.google.com/", "C", "#4285f4"),
    ],
  },
  {
    title: "Дизайн",
    columnSpan: 1,
    color: "#ffe8dc",
    items: [
      bookmark(1501, "Figma", "https://www.figma.com/", "F", "#8057d7"),
      bookmark(1502, "Иконки Lucide", "https://lucide.dev/", "L", "#f56565"),
      bookmark(1503, "Unsplash", "https://unsplash.com/", "U", "#111111"),
    ],
  },
  {
    title: "Проверка качества",
    columnSpan: 2,
    items: [
      bookmark(1601, "Поддержка браузеров", "https://caniuse.com/", "C", "#e34f26"),
      bookmark(1602, "Доступность", "https://www.w3.org/WAI/", "W", "#005a9c"),
      group(1690, "Веб-стандарты", [
        bookmark(1603, "Web.dev", "https://web.dev/", "W", "#4285f4"),
        bookmark(1604, "WHATWG", "https://whatwg.org/", "W", "#333333"),
      ]),
    ],
  },
  {
    title: "Аналитика",
    columnSpan: 4,
    items: [
      bookmark(1701, "Google Analytics", "https://analytics.google.com/", "A", "#f9ab00"),
      bookmark(1702, "Search Console", "https://search.google.com/search-console/", "S", "#458cf5"),
      bookmark(1703, "Отчёт по продукту", "https://lookerstudio.google.com/", "L", "#4285f4"),
      bookmark(1704, "Метрики релиза", "https://github.com/rmfomin/tablo/actions", "M", "#24292f"),
    ],
  },
  {
    title: "Обучение",
    columnSpan: 1,
    items: [
      bookmark(1801, "CSS Tricks", "https://css-tricks.com/", "C", "#e44d26"),
      bookmark(1802, "Frontend Mentor", "https://www.frontendmentor.io/", "F", "#3f54a3"),
      bookmark(1803, "JavaScript.info", "https://javascript.info/", "J", "#f0db4f"),
    ],
  },
  {
    title: "Релиз",
    columnSpan: 2,
    color: "#e1f5eb",
    items: [
      bookmark(1901, "Список изменений", "https://keepachangelog.com/", "K", "#3b82f6"),
      bookmark(1902, "Проверки перед выпуском", "https://github.com/rmfomin/tablo/actions", "C", "#24292f"),
      bookmark(1903, "Управление версиями", "https://semver.org/", "S", "#3c873a"),
    ],
  },
]);

const personalFolders = createFolders(3000, [
  {
    title: "На каждый день",
    columnSpan: 2,
    color: "#fff1d6",
    items: [
      bookmark(3001, "Почта", "https://mail.google.com/", "G", "#ea4335"),
      bookmark(3002, "Календарь", "https://calendar.google.com/", "C", "#4285f4"),
      bookmark(3003, "Карты", "https://maps.google.com/", "M", "#34a853"),
      bookmark(3004, "Google Drive", "https://drive.google.com/", "D", "#4285f4"),
    ],
  },
  {
    title: "Читать",
    columnSpan: 1,
    items: [
      bookmark(3101, "Wikipedia", "https://www.wikipedia.org/", "W", "#555555"),
      bookmark(3102, "Habr", "https://habr.com/", "H", "#629fbc"),
      bookmark(3103, "Научные статьи", "https://scholar.google.com/", "S", "#4285f4"),
    ],
  },
  {
    title: "Дом и быт",
    columnSpan: 4,
    color: "#e7f4e4",
    items: [
      bookmark(3201, "Рецепты", "https://www.bbcgoodfood.com/", "B", "#bb1919"),
      bookmark(3202, "Погода", "https://weather.com/", "W", "#1688f2"),
      bookmark(3203, "Доставка", "https://www.ubereats.com/", "U", "#06c167"),
      bookmark(3204, "Покупки", "https://www.ikea.com/", "I", "#0058a3"),
      bookmark(3205, "Домашние заметки", "https://keep.google.com/", "K", "#fbbc04"),
    ],
  },
  {
    title: "Путешествия",
    columnSpan: 2,
    items: [
      bookmark(3301, "Карты", "https://maps.google.com/", "M", "#34a853"),
      bookmark(3302, "Билеты", "https://www.skyscanner.net/", "S", "#0770e3"),
      group(3390, "План поездки", [
        bookmark(3303, "Жильё", "https://www.airbnb.com/", "A", "#ff5a5f"),
        bookmark(3304, "Места рядом", "https://www.tripadvisor.com/", "T", "#34e0a1"),
      ]),
    ],
  },
  {
    title: "Фотографии",
    columnSpan: 1,
    items: [
      bookmark(3401, "Google Photos", "https://photos.google.com/", "P", "#4285f4"),
      bookmark(3402, "Unsplash", "https://unsplash.com/", "U", "#111111"),
    ],
  },
  {
    title: "Музыка и видео",
    columnSpan: 2,
    items: [
      bookmark(3501, "YouTube", "https://www.youtube.com/", "Y", "#ff0000"),
      bookmark(3502, "Spotify", "https://open.spotify.com/", "S", "#1db954"),
      bookmark(3503, "Кино на вечер", "https://www.imdb.com/", "I", "#f5c518"),
    ],
  },
  {
    title: "Финансы",
    columnSpan: 4,
    items: [
      bookmark(3601, "Бюджет", "https://sheets.google.com/", "S", "#0f9d58"),
      bookmark(3602, "Курсы валют", "https://www.xe.com/currencyconverter/", "X", "#2c9fdb"),
      bookmark(3603, "Налоги и документы", "https://drive.google.com/", "D", "#4285f4"),
    ],
  },
  {
    title: "Здоровье",
    columnSpan: 1,
    items: [
      bookmark(3701, "Тренировки", "https://www.nike.com/ntc-app", "N", "#111111"),
      bookmark(3702, "Прогулки", "https://maps.google.com/", "M", "#34a853"),
      bookmark(3703, "Полезные привычки", "https://todoist.com/", "T", "#e44332"),
    ],
  },
  {
    title: "Идеи и вдохновение",
    columnSpan: 2,
    color: "#f5e4f3",
    items: [
      bookmark(3801, "Awwwards", "https://www.awwwards.com/", "A", "#111111"),
      bookmark(3802, "Pinterest", "https://www.pinterest.com/", "P", "#e60023"),
      bookmark(3803, "Behance", "https://www.behance.net/", "B", "#1769ff"),
      group(3890, "Цвета и шрифты", [
        bookmark(3804, "Google Fonts", "https://fonts.google.com/", "F", "#4285f4"),
        bookmark(3805, "Coolors", "https://coolors.co/", "C", "#fb8500"),
      ]),
    ],
  },
  {
    title: "Учёба",
    columnSpan: 1,
    items: [
      bookmark(3901, "Coursera", "https://www.coursera.org/", "C", "#0056d2"),
      bookmark(3902, "Khan Academy", "https://www.khanacademy.org/", "K", "#14bf96"),
      bookmark(3903, "Словарь", "https://www.merriam-webster.com/", "M", "#224b8f"),
    ],
  },
]);

export const demoSpaces: SpaceV3[] = [
  {
    id: 100,
    position: "1024",
    objectType: "space",
    title: "Работа",
    folders: workFolders,
    quickGroups: [
      {
        title: "Основные сайты",
        color: "blue",
        urls: [
          "https://mail.google.com/",
          "https://calendar.google.com/",
          "https://github.com/rmfomin/tablo",
          "https://linear.app/",
        ],
      },
      {
        title: "Инструменты команды",
        color: "purple",
        urls: ["https://slack.com/", "https://www.figma.com/", "https://www.notion.so/"],
      },
    ],
  },
  {
    id: 200,
    position: "2048",
    objectType: "space",
    title: "Личное",
    folders: personalFolders,
    quickGroups: [
      {
        title: "На каждый день",
        color: "green",
        urls: ["https://mail.google.com/", "https://maps.google.com/", "https://drive.google.com/"],
      },
    ],
  },
];

type DemoTabSeed = {
  title: string;
  url: string;
  icon: string;
  color: string;
  pinned?: boolean;
  groupId?: number;
};

function createDemoTab(id: number, seed: DemoTabSeed) {
  return {
    id,
    index: id - 1,
    windowId: 1,
    active: id === 17,
    highlighted: id === 17,
    pinned: seed.pinned ?? false,
    discarded: false,
    autoDiscardable: true,
    groupId: seed.groupId ?? -1,
    status: "complete",
    incognito: false,
    selected: id === 17,
    url: id === 17 ? location.href : seed.url,
    title: id === 17 ? "Tablo — демо" : seed.title,
    favIconUrl: favicon(seed.icon, seed.color),
  };
}

export const demoTabs = [
  createDemoTab(1, { title: "Gmail", url: "https://mail.google.com/", icon: "G", color: "#ea4335", pinned: true }),
  createDemoTab(2, { title: "Google Calendar", url: "https://calendar.google.com/", icon: "C", color: "#4285f4", pinned: true }),
  createDemoTab(3, { title: "rmfomin/tablo · GitHub", url: "https://github.com/rmfomin/tablo", icon: "G", color: "#24292f", groupId: 1 }),
  createDemoTab(4, { title: "GitHub Actions · Tablo", url: "https://github.com/rmfomin/tablo/actions", icon: "A", color: "#24292f", groupId: 1 }),
  createDemoTab(5, { title: "React", url: "https://react.dev/", icon: "R", color: "#087ea4", groupId: 2 }),
  createDemoTab(6, { title: "TypeScript", url: "https://www.typescriptlang.org/", icon: "T", color: "#3178c6", groupId: 2 }),
  createDemoTab(7, { title: "MDN Web Docs", url: "https://developer.mozilla.org/", icon: "M", color: "#343a40" }),
  createDemoTab(8, { title: "Figma", url: "https://www.figma.com/", icon: "F", color: "#8057d7", groupId: 3 }),
  createDemoTab(9, { title: "Miro", url: "https://miro.com/", icon: "M", color: "#ffd02f", groupId: 3 }),
  createDemoTab(10, { title: "Notion", url: "https://www.notion.so/", icon: "N", color: "#222222" }),
  createDemoTab(11, { title: "Slack", url: "https://slack.com/", icon: "S", color: "#611f69" }),
  createDemoTab(12, { title: "Google Drive", url: "https://drive.google.com/", icon: "D", color: "#4285f4" }),
  createDemoTab(13, { title: "Linear", url: "https://linear.app/", icon: "L", color: "#5e6ad2" }),
  createDemoTab(14, { title: "Chrome Web Store", url: "https://chromewebstore.google.com/", icon: "C", color: "#4285f4" }),
  createDemoTab(15, { title: "GitHub: pull requests", url: "https://github.com/pulls", icon: "G", color: "#24292f" }),
  createDemoTab(16, { title: "Google Meet", url: "https://meet.google.com/", icon: "M", color: "#00897b" }),
  createDemoTab(17, { title: "Tablo — демо", url: location.href, icon: "T", color: "#4e6bff" }),
];

const recentDate = (daysAgo: number, hour = 10) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 15, 0, 0);
  return date.getTime();
};

const historySeeds = [
  ["rmfomin/tablo · GitHub", "https://github.com/rmfomin/tablo", 18, 0],
  ["Действия CI · Tablo", "https://github.com/rmfomin/tablo/actions", 9, 0],
  ["GitHub: pull requests", "https://github.com/pulls", 6, 0],
  ["React", "https://react.dev/", 12, 0],
  ["TypeScript: JavaScript With Syntax For Types", "https://www.typescriptlang.org/", 8, 1],
  ["MDN Web Docs", "https://developer.mozilla.org/", 14, 1],
  ["Figma", "https://www.figma.com/", 7, 1],
  ["Miro", "https://miro.com/", 5, 2],
  ["Notion", "https://www.notion.so/", 11, 2],
  ["Slack", "https://slack.com/", 10, 2],
  ["Google Calendar", "https://calendar.google.com/", 16, 3],
  ["Google Drive", "https://drive.google.com/", 9, 3],
  ["Linear", "https://linear.app/", 13, 4],
  ["Chrome Web Store", "https://chromewebstore.google.com/", 3, 5],
  ["CSS Tricks", "https://css-tricks.com/", 4, 6],
  ["Unsplash", "https://unsplash.com/", 2, 7],
  ["JavaScript.info", "https://javascript.info/", 6, 9],
  ["Awwwards", "https://www.awwwards.com/", 2, 12],
] as const;

export const demoHistory = historySeeds.map(([title, url, visitCount, daysAgo], index) => ({
  id: String(101 + index),
  url,
  title,
  visitCount,
  lastVisitTime: recentDate(daysAgo, 10 + index % 8),
  typedCount: index % 3 === 0 ? 2 : 0,
}));

export const demoBookmarkTree = [{
  id: "0",
  title: "",
  children: [
    {
      id: "1",
      title: "Панель закладок",
      children: [
        { id: "11", title: "Работа", children: [
          { id: "111", title: "Tablo на GitHub", url: "https://github.com/rmfomin/tablo" },
          { id: "112", title: "React", url: "https://react.dev/" },
          { id: "113", title: "Figma", url: "https://www.figma.com/" },
        ] },
        { id: "12", title: "Разработка", children: [
          { id: "121", title: "TypeScript", url: "https://www.typescriptlang.org/" },
          { id: "122", title: "MDN", url: "https://developer.mozilla.org/" },
          { id: "123", title: "Vite", url: "https://vite.dev/" },
        ] },
        { id: "13", title: "Личное", children: [
          { id: "131", title: "YouTube", url: "https://www.youtube.com/" },
          { id: "132", title: "Wikipedia", url: "https://www.wikipedia.org/" },
        ] },
        { id: "14", title: "Путешествия", children: [
          { id: "141", title: "Карты", url: "https://maps.google.com/" },
          { id: "142", title: "Планирование поездок", url: "https://www.skyscanner.net/" },
        ] },
      ],
    },
  ],
}];
