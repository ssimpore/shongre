import React, { useState, useRef, useEffect, useId, useMemo } from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { Input } from "./FormField";
import { IconButton } from "./IconButton";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
} from "../utils/controlMetrics";

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface DropdownMenuProps<T = string> {
  id?: string;
  label?: string;
  placeholder?: string;
  options: DropdownOption<T>[];
  value?: T;
  onChange: (value: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  triggerClassName?: string;
  panelClassName?: string;
  panelWidth?: string;
  className?: string;
  fullWidth?: boolean;
  placement?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  headerTitle?: React.ReactNode;
  renderTrigger?: (
    selectedOption?: DropdownOption<T>,
    isOpen?: boolean,
  ) => React.ReactNode;
  renderOption?: (
    option: DropdownOption<T>,
    isSelected: boolean,
  ) => React.ReactNode;
  /**
   * What this dropdown chooses, in the user's words — "Trier les résultats",
   * "Filtrer par catégorie".
   *
   * Required, and deliberately so. The trigger is a `<button>`, which is not a
   * labelable element, so the visible `<label htmlFor>` sitting above several of
   * these never named them; they all fell back to a generic "Sélectionner une
   * option", and the search page presented five identically-named controls to a
   * screen reader. axe cannot catch it — the fallback is technically an
   * accessible name — so the compiler catches it instead, the same way `Button`
   * requires a name for icon-only controls.
   */
  ariaLabel: string;
  size?: "sm" | "md" | "lg" | "touch";
  /**
   * Optional icon to show on mobile viewports (< sm) instead of the text label,
   * keeping compact toolbars from wrapping or overflowing.
   */
  mobileIcon?: React.ReactNode;
  /** Prevents interaction while preserving the selected value and label. */
  disabled?: boolean;
}

/**
 * Shared standard Dropdown panel classes harmonized with the Header Category Selector
 */
export const DROPDOWN_PANEL_CLASSES =
  "bg-bg-surface rounded-card shadow-dropdown border border-border-base py-2 z-popover animate-in fade-in zoom-in-95 max-h-menu-max overflow-y-auto overscroll-contain";
export const FULL_WIDTH_DROPDOWN_PANEL_CLASSES = "w-full";

export const DROPDOWN_ITEM_CLASSES = {
  base: "w-full min-h-control-sm flex items-center justify-between px-3.5 py-2 text-xs motion-interactive cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  /* The keyboard highlight. Focus never leaves the trigger while a listbox is
     open, so `:focus-visible` cannot express "the option you are on" — without
     its own class, arrowing through the menu moved an invisible cursor. */
  active: "bg-bg-subtle ring-1 ring-inset ring-primary-border",
  selected: "bg-primary-light text-primary font-bold",
  unselected:
    "text-stone-700 hover:bg-bg-subtle hover:text-text-main font-medium",
  disabled: "text-text-disabled cursor-not-allowed opacity-50",
};

export const DROPDOWN_HEADER_CLASSES =
  "px-3.5 pb-2 mb-1 border-b border-border-subtle";
export const DROPDOWN_HEADER_TITLE_CLASSES =
  "text-micro font-bold text-text-muted uppercase tracking-wider mb-1.5 flex items-center justify-between";

export function DropdownMenu<T extends string | number = string>({
  id,
  label,
  placeholder = "Sélectionner…",
  options,
  value,
  onChange,
  searchable = false,
  searchPlaceholder = "Rechercher…",
  triggerClassName = "",
  panelClassName = "",
  panelWidth = "w-64",
  className = "",
  fullWidth = false,
  placement = "bottom-left",
  headerTitle,
  renderTrigger,
  renderOption,
  ariaLabel,
  size = "md",
  mobileIcon,
  disabled = false,
}: DropdownMenuProps<T>) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const listboxId = `${id ?? "dropdown"}-${generatedId}`;
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = useMemo(
    () =>
      searchable && searchText.trim()
        ? options.filter(
            (opt) =>
              opt.label.toLowerCase().includes(searchText.toLowerCase()) ||
              (opt.sublabel &&
                opt.sublabel.toLowerCase().includes(searchText.toLowerCase())),
          )
        : options,
    [options, searchable, searchText],
  );

  /**
   * The virtually-focused option.
   *
   * This panel declares `role="listbox"` with `role="option"` children, and a
   * listbox owes the keyboard the arrow keys — but it had none. Opening the
   * sort menu and pressing Down did nothing at all; the only way through the
   * options was to Tab across every one of them, which is not how any screen
   * reader user expects a listbox to behave and not what the role promises.
   *
   * Focus stays on the trigger (or on the search field when there is one) and
   * `aria-activedescendant` names the current option, so typing in the filter
   * and arrowing through what it leaves are the same interaction.
   *
   * Safari does not focus a `<button>` when you click it, so a handler bound to
   * the trigger alone never fired there — the menu opened and then ignored the
   * keyboard completely. The trigger is focused explicitly on open, and Escape
   * is additionally handled at the document so closing works from wherever
   * focus actually ended up.
   */
  const [activeIndex, setActiveIndex] = useState(-1);

  const firstEnabled = (from: number, step: number) => {
    for (let i = from; i >= 0 && i < filteredOptions.length; i += step) {
      if (!filteredOptions[i].disabled) return i;
    }
    return -1;
  };

  // Opening lands on the current selection, the way a native select does.
  useEffect(() => {
    if (!isOpen) {
      setSearchText("");
      setActiveIndex(-1);
      return;
    }
    const selectedIndex = filteredOptions.findIndex(
      (opt) => opt.value === value,
    );
    setActiveIndex(
      selectedIndex >= 0 && !filteredOptions[selectedIndex]?.disabled
        ? selectedIndex
        : firstEnabled(0, 1),
    );
    // A searchable panel autofocuses its filter; otherwise the trigger has to
    // hold focus for the arrow keys to reach this component at all.
    if (!searchable) triggerRef.current?.focus();
    // `value` is read once on open on purpose: re-syncing on every change would
    // yank the highlight away while the user is arrowing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Filtering can strip the active option out from under the highlight.
  useEffect(() => {
    if (!isOpen) return;
    setActiveIndex((current) =>
      current >= filteredOptions.length || current < 0
        ? firstEnabled(0, 1)
        : current,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredOptions.length]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    listboxRef.current
      ?.querySelector(`#${CSS.escape(optionId(activeIndex))}`)
      ?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, isOpen]);

  const close = (returnFocus: boolean) => {
    setIsOpen(false);
    // Escape used to leave focus on <body>, dropping a keyboard user back at
    // the top of the document with no way back to the control they just left.
    if (returnFocus) triggerRef.current?.focus();
  };

  const commit = (option: DropdownOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    close(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (
        event.key === "ArrowDown" ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => {
          const next = firstEnabled(i + 1, 1);
          return next === -1 ? firstEnabled(0, 1) : next;
        });
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => {
          const prev = firstEnabled(i - 1, -1);
          return prev === -1
            ? firstEnabled(filteredOptions.length - 1, -1)
            : prev;
        });
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(firstEnabled(0, 1));
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(firstEnabled(filteredOptions.length - 1, -1));
        break;
      case "Enter":
        // A search field is a text input first: only steal Enter when the
        // highlight is actually on something.
        if (activeIndex >= 0 && filteredOptions[activeIndex]) {
          event.preventDefault();
          commit(filteredOptions[activeIndex]);
        }
        break;
      case " ":
        if (searchable) break; // a space belongs to the filter text
        if (activeIndex >= 0 && filteredOptions[activeIndex]) {
          event.preventDefault();
          commit(filteredOptions[activeIndex]);
        }
        break;
      case "Escape":
        event.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    /* Escape must close an open menu wherever focus is — including the Safari
       case above, and a click that landed on the panel's own scrollbar. */
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      close(true);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const activeDescendant =
    isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined;

  useEffect(() => {
    if (disabled && isOpen) setIsOpen(false);
  }, [disabled, isOpen]);

  const placementClasses = {
    "bottom-left": "left-0 top-full mt-1.5",
    "bottom-right": "right-0 top-full mt-1.5",
    "top-left": "left-0 bottom-full mb-1.5",
    "top-right": "right-0 bottom-full mb-1.5",
  }[placement];

  const sizeClasses = {
    sm: "h-control-sm px-2.5 text-xs rounded-control gap-1.5",
    md: "h-control-md px-3 text-xs rounded-control gap-2",
    lg: "h-control-touch px-3.5 text-sm rounded-control gap-2.5",
    touch: "h-control-touch px-3.5 text-xs rounded-control gap-2",
  }[size];

  const effectivePanelWidth = fullWidth
    ? FULL_WIDTH_DROPDOWN_PANEL_CLASSES
    : panelWidth;

  return (
    <div
      className={`relative ${fullWidth ? "w-full block" : "inline-block"} text-left ${className}`}
      ref={containerRef}
      /* Tells an enclosing Modal/Drawer that Escape belongs to this menu first,
         so dismissing the menu does not also dismiss the surface holding it. */
      data-popover-open={isOpen || undefined}
    >
      {renderTrigger ? (
        // A custom trigger still has to be a real control: as a bare <div> the
        // menu could not be opened from the keyboard and announced as nothing.
        <button
          id={id}
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={searchable ? undefined : activeDescendant}
          aria-label={ariaLabel}
          className={
            fullWidth
              ? "w-full text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              : "text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          }
        >
          {renderTrigger(selectedOption, isOpen)}
        </button>
      ) : (
        <button
          id={id}
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={searchable ? undefined : activeDescendant}
          aria-label={ariaLabel}
          className={`inline-flex items-center justify-between bg-bg-base hover:bg-bg-subtle border border-border-base text-stone-800 font-semibold ${CONTROL_MOTION_CLASS} cursor-pointer select-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-bg-base ${CONTROL_FOCUS_CLASS} ${
            fullWidth ? "w-full" : ""
          } ${
            isOpen ? "border-primary ring-2 ring-primary/20 bg-bg-surface" : ""
          } ${sizeClasses} ${triggerClassName}`}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 truncate">
            {mobileIcon ? (
              <>
                <span className="sm:hidden flex items-center justify-center shrink-0">
                  {mobileIcon}
                </span>
                {selectedOption?.icon && (
                  <span className="hidden sm:inline-flex shrink-0">
                    {selectedOption.icon}
                  </span>
                )}
                <span className="hidden sm:inline truncate">
                  {selectedOption?.label || placeholder}
                </span>
              </>
            ) : (
              <>
                {selectedOption?.icon}
                <span className="truncate">
                  {selectedOption?.label || placeholder}
                </span>
              </>
            )}
          </div>
          <ChevronDown
            className={`w-icon-sm h-icon-sm text-text-muted shrink-0 transition-transform duration-normal ${
              isOpen ? "rotate-180 text-primary" : ""
            }`}
          />
        </button>
      )}

      {isOpen && (
        <div
          id={listboxId}
          ref={listboxRef}
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute ${placementClasses} ${effectivePanelWidth} ${DROPDOWN_PANEL_CLASSES} ${panelClassName}`}
        >
          {(headerTitle || searchable) && (
            <div className={DROPDOWN_HEADER_CLASSES}>
              {headerTitle && (
                <div className={DROPDOWN_HEADER_TITLE_CLASSES}>
                  <span>{headerTitle}</span>
                  {selectedOption && (
                    <span className="text-primary lowercase font-medium text-micro">
                      {t("ui.dropdownMenu.selectionne")}
                    </span>
                  )}
                </div>
              )}
              {searchable && (
                <Input
                  size="sm"
                  type="text"
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  aria-controls={listboxId}
                  aria-activedescendant={activeDescendant}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  rightIcon={
                    searchText ? (
                      <IconButton
                        size="sm"
                        variant="ghost"
                        ariaLabel={t("ui.dropdownMenu.effacerLaRecherche")}
                        onClick={() => setSearchText("")}
                      >
                        <X className="h-icon-sm w-icon-sm" />
                      </IconButton>
                    ) : undefined
                  }
                />
              )}
            </div>
          )}

          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3.5 py-3 text-xs text-text-muted text-center font-medium">
                {t("ui.dropdownMenu.aucunResultatTrouve")}
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;

                if (renderOption) {
                  return (
                    <button
                      key={String(option.value)}
                      id={optionId(index)}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      // Focus stays on the trigger; the highlight is carried by
                      // aria-activedescendant, so options are not tab stops.
                      tabIndex={-1}
                      disabled={option.disabled}
                      onPointerMove={() => setActiveIndex(index)}
                      onClick={() => commit(option)}
                      className={`w-full text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                        isActive ? DROPDOWN_ITEM_CLASSES.active : ""
                      }`}
                    >
                      {renderOption(option, isSelected)}
                    </button>
                  );
                }

                return (
                  <button
                    key={String(option.value)}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    type="button"
                    disabled={option.disabled}
                    onPointerMove={() => setActiveIndex(index)}
                    onClick={() => commit(option)}
                    className={`${DROPDOWN_ITEM_CLASSES.base} ${
                      option.disabled
                        ? DROPDOWN_ITEM_CLASSES.disabled
                        : isSelected
                          ? DROPDOWN_ITEM_CLASSES.selected
                          : DROPDOWN_ITEM_CLASSES.unselected
                    } ${isActive && !option.disabled ? DROPDOWN_ITEM_CLASSES.active : ""}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 truncate">
                      {option.icon}
                      <div className="min-w-0 truncate">
                        <div className="truncate leading-snug">
                          {option.label}
                        </div>
                        {option.sublabel && (
                          <div className="text-micro text-text-muted font-normal truncate">
                            {option.sublabel}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {option.badge}
                      {isSelected && (
                        <Check className="w-icon-sm h-icon-sm text-primary shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
