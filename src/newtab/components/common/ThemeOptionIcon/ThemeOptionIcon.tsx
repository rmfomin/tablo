import React from "react";
import { ColorTheme } from "@/newtab/helpers/types";
import ThemeAutoIcon from "./icons/theme-auto.svg";
import ThemeDarkIcon from "./icons/theme-dark.svg";
import ThemeLightIcon from "./icons/theme-light.svg";

const iconStyle: React.CSSProperties = {
  display: "block",
  width: 18,
  height: 18,
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 2,
};

export function getThemeOptionButtonStyle(
  isActive: boolean
): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    minWidth: 28,
    padding: 0,
    borderRadius: "50%",
    backgroundColor: isActive ? "#dbe7ff" : undefined,
    color: isActive ? "#111827" : undefined,
  };
}

export const ThemeOptionIcon = (props: { theme: ColorTheme }) => {
  if (props.theme === "light") {
    return <ThemeLightIcon style={iconStyle} aria-hidden="true" />;
  }

  if (props.theme === "dark") {
    return <ThemeDarkIcon style={iconStyle} aria-hidden="true" />;
  }

  return <ThemeAutoIcon style={iconStyle} aria-hidden="true" />;
};
