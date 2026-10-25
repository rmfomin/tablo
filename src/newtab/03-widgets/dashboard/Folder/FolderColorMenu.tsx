import React from "react";
import { DropdownMenu } from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenu";
import type { Point } from "@/newtab/06-shared/lib/math";
import { colors } from "@/newtab/06-shared/lib/color/palette";

export function FolderColorMenu({ position, color, onPreview, onCommit, onClose }: {
  position?: Point;
  color?: string;
  onPreview: (color: string) => void;
  onCommit: (color: string) => void;
  onClose: () => void;
}) {
  return (
    <DropdownMenu
      onClose={onClose}
      className="dropdown-menu--folder dropdown-menu--context"
      absPosition={position}
    >
      <div className="dropdown-menu__colors-row">
        {PRESET_COLORS.map(preset => (
          <PresetColor key={preset} color={preset} onClick={onCommit} currentColor={color} />
        ))}
        <CustomColorInput onChange={onPreview} onBlur={onCommit} currentColor={color} />
      </div>
    </DropdownMenu>
  );
}

const PRESET_COLORS = [...colors];
PRESET_COLORS.length = 7;

function PresetColor(p: {
  onClick: (color: string) => void;
  color: string;
  currentColor?: string;
}) {
  const borderColor = window.pSBC(-0.5, p.color);
  const onClick = () => {
    p.onClick(p.color);
  };
  const active = p.color === p.currentColor;
  return (
    <button
      className={"dropdown-menu__preset_color " + (active ? "selected" : "")}
      tabIndex={0}
      onClick={onClick}
    >
      <span style={{ backgroundColor: p.color, borderColor }}></span>
    </button>
  );
}

function CustomColorInput(p: {
  onChange: (color: string) => void;
  onBlur: (color: string) => void;
  currentColor?: string;
}) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    p.onChange(e.target.value);
  };
  const onBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    p.onBlur(e.target.value);
  };

  const active = !PRESET_COLORS.includes(p.currentColor!);
  return (
    <div className={"color-picker-container " + (active ? "selected" : "")}>
      <input
        type="color"
        id="colorInput"
        value={p.currentColor}
        onChange={(e) => onChange(e)}
        onBlur={(e) => onBlur(e)}
      />
      <label htmlFor="colorInput" className="custom-color-picker"></label>
    </div>
  );
}
