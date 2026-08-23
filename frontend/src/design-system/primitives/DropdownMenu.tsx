import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
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
}

/**
 * Shared standard Dropdown panel classes harmonized with the Header Category Selector
 */
export const DROPDOWN_PANEL_CLASSES =
  "bg-bg-surface rounded-card shadow-dropdown border border-border-base py-2 z-popover animate-in fade-in zoom-in-95 max-h-menu-max overflow-y-auto overscroll-contain";

export const DROPDOWN_ITEM_CLASSES = {
  base: "w-full min-h-control-sm flex items-center justify-between px-3.5 py-2 text-xs motion-interactive cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  selected: "bg-primary-light text-primary font-bold",
  unselected:
    "text-stone-700 hover:bg-bg-subtle hover:text-stone-900 font-medium",
  disabled: "text-stone-400 cursor-not-allowed opacity-50",
};

export const DROPDOWN_HEADER_CLASSES =
  "px-3.5 pb-2 mb-1 border-b border-border-subtle";
export const DROPDOWN_HEADER_TITLE_CLASSES =
  "text-micro font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex items-center justify-between";
export const DROPDOWN_SEARCH_INPUT_CLASSES =
  "w-full h-control-sm px-2.5 bg-bg-base border border-border-base rounded-control text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-bg-surface motion-interactive";

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
}: DropdownMenuProps<T>) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!isOpen) {
      setSearchText("");
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  const filteredOptions =
    searchable && searchText.trim()
      ? options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(searchText.toLowerCase()) ||
            (opt.sublabel &&
              opt.sublabel.toLowerCase().includes(searchText.toLowerCase())),
        )
      : options;

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

  const effectivePanelWidth = fullWidth ? "w-full min-w-[240px]" : panelWidth;

  return (
    <div
      className={`relative ${fullWidth ? "w-full block" : "inline-block"} text-left ${className}`}
      ref={containerRef}
    >
      {renderTrigger ? (
        // A custom trigger still has to be a real control: as a bare <div> the
        // menu could not be opened from the keyboard and announced as nothing.
        <button
          id={id}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          className={
            fullWidth
              ? "w-full text-left cursor-pointer"
              : "text-left cursor-pointer"
          }
        >
          {renderTrigger(selectedOption, isOpen)}
        </button>
      ) : (
        <button
          id={id}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          className={`inline-flex items-center justify-between bg-bg-base hover:bg-bg-subtle border border-border-base text-stone-800 font-semibold ${CONTROL_MOTION_CLASS} cursor-pointer select-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${CONTROL_FOCUS_CLASS} ${
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
            className={`w-3.5 h-3.5 text-stone-500 shrink-0 transition-transform duration-normal ${
              isOpen ? "rotate-180 text-primary" : ""
            }`}
          />
        </button>
      )}

      {isOpen && (
        <div
          role="listbox"
          aria-labelledby={id}
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
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className={DROPDOWN_SEARCH_INPUT_CLASSES}
                    autoFocus
                  />
                  {searchText && (
                    <button
                      type="button"
                      onClick={() => setSearchText("")}
                      className="absolute right-2 text-stone-400 hover:text-stone-600 cursor-pointer p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3.5 py-3 text-xs text-stone-500 text-center font-medium">
                {t("ui.dropdownMenu.aucunResultatTrouve")}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;

                if (renderOption) {
                  return (
                    <button
                      key={String(option.value)}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className="w-full text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {renderOption(option, isSelected)}
                    </button>
                  );
                }

                return (
                  <button
                    key={String(option.value)}
                    role="option"
                    aria-selected={isSelected}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`${DROPDOWN_ITEM_CLASSES.base} ${
                      option.disabled
                        ? DROPDOWN_ITEM_CLASSES.disabled
                        : isSelected
                          ? DROPDOWN_ITEM_CLASSES.selected
                          : DROPDOWN_ITEM_CLASSES.unselected
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 truncate">
                      {option.icon}
                      <div className="min-w-0 truncate">
                        <div className="truncate leading-snug">
                          {option.label}
                        </div>
                        {option.sublabel && (
                          <div className="text-micro text-stone-500 font-normal truncate">
                            {option.sublabel}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {option.badge}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
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
