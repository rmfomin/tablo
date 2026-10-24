import type { SpaceV3 } from "@/newtab/05-entities/dashboard/model/types";

const favicon = (letter: string, color: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${color}"/><text x="16" y="22" text-anchor="middle" font-family="Arial" font-size="19" fill="white">${letter}</text></svg>`)}`;

const bookmark = (id: number, title: string, url: string, letter: string, color: string) => ({
  id,
  position: `${id * 1024}`,
  type: "bookmark" as const,
  objectType: "bookmark" as const,
  title,
  url,
  favIconUrl: favicon(letter, color),
});

export const demoSpaces: SpaceV3[] = [
  {
    id: 100,
    position: "1024",
    objectType: "space",
    title: "Работа",
    folders: [
      {
        id: 110,
        position: "1024",
        objectType: "folder",
        title: "На сегодня",
        items: [
          bookmark(111, "Tablo в GitHub", "https://github.com/rmfomin/tablo", "G", "#24292f"),
          bookmark(112, "Макеты в Figma", "https://www.figma.com/", "F", "#8057d7"),
          bookmark(113, "Заметки команды", "https://notion.so/", "N", "#222222"),
        ],
      },
      {
        id: 120,
        position: "2048",
        objectType: "folder",
        title: "Исследования",
        color: "#d5e7ff",
        items: [
          bookmark(121, "MDN Web Docs", "https://developer.mozilla.org/", "M", "#343a40"),
          {
            id: 122,
            position: "2048",
            objectType: "group",
            type: "group",
            title: "React",
            groupItems: [
              bookmark(123, "React", "https://react.dev/", "R", "#087ea4"),
              bookmark(124, "TypeScript", "https://www.typescriptlang.org/", "T", "#3178c6"),
            ],
          },
        ],
      },
    ],
    quickGroups: [{ title: "Читать позже", color: "blue", urls: ["https://developer.mozilla.org/"] }],
  },
  {
    id: 200,
    position: "2048",
    objectType: "space",
    title: "Личное",
    folders: [
      {
        id: 210,
        position: "1024",
        objectType: "folder",
        title: "Вдохновение",
        items: [
          bookmark(211, "Awwwards", "https://www.awwwards.com/", "A", "#111111"),
          bookmark(212, "Unsplash", "https://unsplash.com/", "U", "#111111"),
        ],
      },
    ],
  },
];

export const demoTabs = [
  { id: 1, index: 0, windowId: 1, active: false, highlighted: false, pinned: false, discarded: false, autoDiscardable: true, groupId: -1, status: "complete", incognito: false, selected: false, url: "https://github.com/rmfomin/tablo", title: "rmfomin/tablo · GitHub", favIconUrl: favicon("G", "#24292f") },
  { id: 2, index: 1, windowId: 1, active: false, highlighted: false, pinned: false, discarded: false, autoDiscardable: true, groupId: -1, status: "complete", incognito: false, selected: false, url: "https://react.dev/", title: "React", favIconUrl: favicon("R", "#087ea4") },
  { id: 3, index: 2, windowId: 1, active: false, highlighted: false, pinned: false, discarded: false, autoDiscardable: true, groupId: -1, status: "complete", incognito: false, selected: false, url: "https://developer.mozilla.org/", title: "MDN Web Docs", favIconUrl: favicon("M", "#343a40") },
  { id: 4, index: 3, windowId: 1, active: true, highlighted: true, pinned: false, discarded: false, autoDiscardable: true, groupId: -1, status: "complete", incognito: false, selected: true, url: location.href, title: "Tablo — demo", favIconUrl: favicon("T", "#4e6bff") },
];

const recentDate = (daysAgo: number) => Date.now() - daysAgo * 24 * 60 * 60 * 1000;

export const demoHistory = [
  { id: "101", url: "https://github.com/rmfomin/tablo", title: "rmfomin/tablo · GitHub", visitCount: 12, lastVisitTime: recentDate(0), typedCount: 3 },
  { id: "102", url: "https://react.dev/", title: "React", visitCount: 8, lastVisitTime: recentDate(0), typedCount: 1 },
  { id: "103", url: "https://developer.mozilla.org/", title: "MDN Web Docs", visitCount: 6, lastVisitTime: recentDate(1), typedCount: 1 },
  { id: "104", url: "https://www.figma.com/", title: "Figma", visitCount: 4, lastVisitTime: recentDate(2), typedCount: 0 },
  { id: "105", url: "https://www.typescriptlang.org/", title: "TypeScript: JavaScript With Syntax For Types", visitCount: 3, lastVisitTime: recentDate(3), typedCount: 1 },
  { id: "106", url: "https://notion.so/", title: "Notion", visitCount: 2, lastVisitTime: recentDate(4), typedCount: 0 },
];

export const demoBookmarkTree = [{
  id: "0",
  title: "",
  children: [
    { id: "1", title: "Панель закладок", children: [
      { id: "11", title: "Работа", children: [
        { id: "111", title: "GitHub", url: "https://github.com/rmfomin/tablo" },
        { id: "112", title: "React", url: "https://react.dev/" },
      ] },
      { id: "12", title: "Дизайн", children: [
        { id: "121", title: "Figma", url: "https://www.figma.com/" },
        { id: "122", title: "Unsplash", url: "https://unsplash.com/" },
      ] },
    ] },
  ],
}];
