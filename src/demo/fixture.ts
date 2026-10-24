import demoBackup from "./demo-state.json";
import type { SpaceV3 } from "@/newtab/05-entities/dashboard/model/types";

const favicon = (letter: string, color: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${color}"/><text x="16" y="22" text-anchor="middle" font-family="Arial" font-size="19" fill="white">${letter}</text></svg>`)}`;

export const demoSpaces = demoBackup.spaces as unknown as SpaceV3[];
export const demoSettings = demoBackup.settings.values;

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
