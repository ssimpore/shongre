import React, { useState } from "react";
import {
  Car,
  Home,
  Briefcase,
  Wrench,
  Sparkles,
  Laptop,
  Shirt,
  Baby,
  BookOpen,
  Trophy,
  Dog,
  HardHat,
  Tractor,
  Sun,
  Server,
  Gift,
  Phone,
  Watch,
  Folder,
  Tag,
  ShieldCheck,
  ShoppingBag,
  Camera,
  Music,
  Gamepad2,
  Bike,
  Truck,
  FileText,
  Layers,
  Heart,
  Palette,
  Compass,
  Cpu,
  Package,
  KeyRound,
  Zap,
} from "lucide-react";
import { Modal } from "../../../../../design-system/primitives/Modal";
import { Button } from "../../../../../design-system/primitives/Button";
import { Input } from "../../../../../design-system/primitives/FormField";
import { useTranslation } from "../../../../../i18n/I18nProvider";

export const AVAILABLE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Car,
  Home,
  Briefcase,
  Wrench,
  Sparkles,
  Laptop,
  Shirt,
  Baby,
  BookOpen,
  Trophy,
  Dog,
  HardHat,
  Tractor,
  Sun,
  Server,
  Gift,
  Phone,
  Watch,
  Folder,
  Tag,
  ShieldCheck,
  ShoppingBag,
  Camera,
  Music,
  Gamepad2,
  Bike,
  Truck,
  FileText,
  Layers,
  Heart,
  Palette,
  Compass,
  Cpu,
  Package,
  KeyRound,
  Zap,
};

export interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIcon?: string;
  onSelectIcon: (iconName: string) => void;
}

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  isOpen,
  onClose,
  selectedIcon,
  onSelectIcon,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const filteredIcons = Object.keys(AVAILABLE_ICONS).filter((name) =>
    name.toLowerCase().includes(search.toLowerCase().trim()),
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("admin.iconPickerModal.selectionnerUneIconeCanonique")}
      description={t("admin.iconPickerModal.choisissezParmiLeRegistreDes")}
      maxWidth="md"
    >
      <div className="space-y-4">
        <Input
          placeholder={t("admin.iconPickerModal.rechercherUneIconeExCar")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2.5 max-h-64 overflow-y-auto p-1 border border-border-base rounded-control bg-bg-subtle">
          {filteredIcons.map((iconName) => {
            const IconComponent = AVAILABLE_ICONS[iconName];
            const isSelected = selectedIcon === iconName;

            return (
              <button
                key={iconName}
                type="button"
                onClick={() => {
                  onSelectIcon(iconName);
                  onClose();
                }}
                className={`p-2.5 rounded-control border flex flex-col items-center justify-center gap-1.5 transition-all text-stone-700 hover:border-primary hover:bg-bg-surface hover:text-primary ${
                  isSelected
                    ? "border-primary bg-primary-light text-primary ring-2 ring-primary/20 shadow-xs"
                    : "border-border-subtle bg-bg-surface"
                }`}
                title={iconName}
              >
                <IconComponent className="w-5 h-5" />
                <span className="text-micro truncate max-w-full font-mono">
                  {iconName}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
};
