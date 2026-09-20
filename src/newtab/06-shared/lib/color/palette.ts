export const DEFAULT_FOLDER_COLOR = "#f0f0f0";
export const EMPTY_FOLDER_COLOR = "transparent";

export const colors = [
  "#82E9DE",
  "#A0F3A2",
  "#D3A8FF",
  "#A4D7FF",
  "#F55666",
  "#FFE066",
  "#FFB347",

  "#FFC4A3",
  "#FADC43",
  "#85ECA1",
  "#95CFFF",
  "#C7B0FF",
  "#CCE7CD",
  "#F1DFAA",
  "#F7A8E3",
  "#FF8695",
  "#FFBFC2",

  // old colors

  "#f8bbd0",
  "#d1c4e9",
  "#bbdefb",
  "#b2ebf2",
  "#b2dfdb",
  "#dcedc8",
  "#f0f4c3",
  "#ffecb3",
  "#ffccbc",
  "#d7ccc8",
];

export function getRandomHEXColor(): string {
  return colors[Math.round(Math.random() * (colors.length - 1))];
}
