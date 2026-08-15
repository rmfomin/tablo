import React, {
  CSSProperties,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createContext } from "react";
import cn from "clsx";
import ReactDOM from "react-dom";
import { isSomeParentHaveClass } from "@/newtab/06-shared/lib/dom/html";
import { Offset, Point } from "@/newtab/06-shared/lib/math";

const DROPDOWN_MENU_OPENED_EVENT = "dropdown-menu-opened";

export const DropdownSetMenuIdContext = createContext((_id: number) => {});
export const DropdownMenuIdContext = createContext(-1);

interface DropdownSubMenuProps {
  menuId: number;
  title: string;
  style?: CSSProperties | undefined;
  submenuContent: React.ReactNode; //todo make is a function to calc it lazily
}

function getOffsets(o?: Partial<Offset>): Offset {
  return {
    top: o?.top ?? 0,
    bottom: o?.bottom ?? 8,
    left: o?.left ?? 0,
    right: o?.right ?? 8,
  };
}

export const DropdownSubMenu = ({
  menuId,
  title,
  submenuContent,
  style,
}: DropdownSubMenuProps) => {
  const [activeSubmenuId, setActiveSubmenuId] = useState(-1);
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 });

  const setCurrentMenuId = useContext(DropdownSetMenuIdContext);
  const currentMenuId = useContext(DropdownMenuIdContext);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);

  const onClick = () => {
    setCurrentMenuId(menuId);

    requestAnimationFrame(() => {
      if (buttonRef.current && submenuRef.current) {
        const { innerWidth, innerHeight } = window;
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const submenuRect = submenuRef.current.getBoundingClientRect();

        const submenuWidth = submenuRect.width;
        const submenuHeight = submenuRect.height;

        let top = buttonRect.top - 4;
        let left = buttonRect.right + 12;

        // Adjust positioning if submenu overflows the viewport
        if (buttonRect.right + submenuWidth > innerWidth) {
          left = buttonRect.left - submenuWidth;
        }

        if (buttonRect.top + submenuHeight > innerHeight) {
          top = innerHeight - submenuHeight;
        }

        setSubmenuPosition({ top, left });
      }
    });
  };

  return (
    <>
      <button
        ref={buttonRef}
        style={style}
        className={cn("dropdown-menu__button sub-menu__button focusable", {
          active: menuId === currentMenuId,
        })}
        onClick={onClick}
      >
        {title}
        <span className="sub-menu__button__icon">→</span>
      </button>
      {menuId === currentMenuId
        ? ReactDOM.createPortal(
            <div
              ref={submenuRef}
              className="sub-menu"
              style={{
                top: `${submenuPosition.top}px`,
                left: `${submenuPosition.left}px`,
                visibility:
                  submenuPosition.top || submenuPosition.left
                    ? "visible"
                    : "hidden",
              }}
            >
              <DropdownSetMenuIdContext.Provider value={setActiveSubmenuId}>
                <DropdownMenuIdContext.Provider value={activeSubmenuId}>
                  {submenuContent}
                </DropdownMenuIdContext.Provider>
              </DropdownSetMenuIdContext.Provider>
            </div>,
            document.body,
          )
        : null}
    </>
  );
};

export function DropdownMenu(p: {
  className?: string;
  offset?: Partial<Offset>;
  absPosition?: Point;
  width?: number;
  alignRight?: boolean;
  children: any; //todo fix types
  onClose: () => void;
  noSmartPositioning?: boolean;
  skipTabIndexes?: boolean;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuIdRef = useRef(Math.random().toString(36).slice(2));
  const closeRef = useRef(p.onClose);
  const [activeSubmenuId, setActiveSubmenuId] = useState(-1);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  closeRef.current = p.onClose;

  useEffect(() => {
    function onOtherMenuOpened(e: Event) {
      if ((e as CustomEvent<string>).detail !== menuIdRef.current) {
        closeRef.current();
      }
    }

    function onOutsideClick(e: MouseEvent) {
      // ignore submenu clicks
      const target = e.target as HTMLElement;
      if (
        isSomeParentHaveClass(target, "sub-menu") ||
        isSomeParentHaveClass(target, "modal-wrapper")
      ) {
        return;
      }

      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as HTMLElement)
      ) {
        closeRef.current();
      }
    }

    function onKeydown(e: KeyboardEvent) {
      const getButtons = () =>
        Array.from(menuRef.current?.querySelectorAll(".focusable") || []);
      const isInputInFocus = document.activeElement?.tagName === "INPUT";

      if (e.key === "Escape" || (isInputInFocus && e.key === "Enter")) {
        closeRef.current();
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); // Prevent page scrolling
        const buttons = getButtons();
        let nextIndex = buttons.indexOf(document.activeElement!);

        if (e.key === "ArrowDown") {
          nextIndex = nextIndex + 1 >= buttons.length ? 0 : nextIndex + 1;
        } else if (e.key === "ArrowUp") {
          nextIndex = nextIndex - 1 < 0 ? buttons.length - 1 : nextIndex - 1;
        }

        // Focus the next button
        (buttons[nextIndex] as HTMLElement)?.focus();
      }
    }

    const outsideClickListenerTimerId = window.setTimeout(() => {
      document.addEventListener("click", onOutsideClick);
    }, 0);
    document.addEventListener(DROPDOWN_MENU_OPENED_EVENT, onOtherMenuOpened);
    document.dispatchEvent(
      new CustomEvent(DROPDOWN_MENU_OPENED_EVENT, {
        detail: menuIdRef.current,
      }),
    );
    document.addEventListener("keydown", onKeydown);

    return () => {
      window.clearTimeout(outsideClickListenerTimerId);
      document.removeEventListener("click", onOutsideClick);
      document.removeEventListener(
        DROPDOWN_MENU_OPENED_EVENT,
        onOtherMenuOpened,
      );
      document.removeEventListener("keydown", onKeydown);
    };
  }, []);

  // Adjust menu position based on available space when it opens
  useEffect(() => {
    if (menuRef.current && anchorRef.current) {
      const { innerWidth, innerHeight } = window;
      const menuRect = menuRef.current.getBoundingClientRect();
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const pos = { top: 0, left: 0 };
      const offset = getOffsets(p.offset);
      if (p.absPosition) {
        pos.top = p.absPosition.y;
        pos.left = p.absPosition.x;
      } else {
        pos.top = anchorRect.top + offset.top;
        pos.left = anchorRect.left + offset.left;
      }

      // Adjust positioning if submenu overflows the viewport
      if (pos.left + menuRect.width > innerWidth) {
        if (p.absPosition) {
          pos.left = innerWidth - menuRect.width - offset.right;
        } else {
          pos.left = anchorRect.left - menuRect.width - offset.right;
        }
      }

      if (pos.top + menuRect.height > innerHeight) {
        pos.top = pos.top - (menuRect.height + offset.bottom);
      }

      setMenuPos(pos);
    }
  }, []);

  return (
    <>
      <div
        className="dropdown-menu__anchor"
        style={p.alignRight ? { right: 0 } : {}}
        ref={anchorRef}
      ></div>
      {ReactDOM.createPortal(
        <div
          className={"dropdown-menu " + (p.className || "")}
          style={{
            top: `${menuPos.top}px`,
            left: `${menuPos.left}px`,
            opacity: menuPos.top || menuPos.left ? "1" : "0",
            width: p.width ? `${p.width}px` : "fit-content",
          }}
          ref={menuRef}
        >
          <DropdownSetMenuIdContext.Provider value={setActiveSubmenuId}>
            <DropdownMenuIdContext.Provider value={activeSubmenuId}>
              {p.children}
            </DropdownMenuIdContext.Provider>
          </DropdownSetMenuIdContext.Provider>
        </div>,
        document.body,
      )}
    </>
  );
}
