import React, { useState } from "react";
import { Star, Check, Sparkles } from "lucide-react";
import { Modal } from "../../../design-system/primitives/Modal";
import { Button } from "../../../design-system/primitives/Button";
import { Textarea } from "../../../design-system/primitives/FormField";
import { userRepository } from "../../../repositories/user.repository";
import { useToast } from "../../../app/providers/ToastProvider";
import { Transaction, UserProfile } from "../../../types";
import { useTranslation } from "../../../i18n/I18nProvider";

interface LeaveReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  currentUser: UserProfile;
  onReviewSubmitted: (reviewId: string) => void;
}

const POSITIVE_BADGES = [
  "Article conforme à la description",
  "Envoi ultra-rapide",
  "Emballage soigné & sécurisé",
  "Vendeur très réactif",
  "Excellente communication",
  "Paiement immédiat",
];

export const LeaveReviewModal: React.FC<LeaveReviewModalProps> = ({
  isOpen,
  onClose,
  transaction,
  currentUser,
  onReviewSubmitted,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedBadges, setSelectedBadges] = useState<string[]>([
    "Article conforme à la description",
    "Vendeur très réactif",
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetUserId =
    currentUser.id === transaction.buyerId
      ? transaction.sellerId
      : transaction.buyerId;
  const targetUserName =
    currentUser.id === transaction.buyerId
      ? transaction.sellerName
      : transaction.buyerName;

  const toggleBadge = (badge: string) => {
    setSelectedBadges((prev) =>
      prev.includes(badge) ? prev.filter((b) => b !== badge) : [...prev, badge],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;
    setIsSubmitting(true);

    try {
      const fullComment =
        selectedBadges.length > 0
          ? `${comment ? comment + "\n\n" : ""}Points forts : ${selectedBadges.join(", ")}`
          : comment;

      const newRev = await userRepository.addReview({
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorAvatarUrl: currentUser.avatarUrl,
        targetUserId,
        rating,
        comment: fullComment || "Transaction parfaite ! Vendeur recommandé.",
        listingTitle: transaction.listingTitle,
      });

      toast.success(
        "Votre évaluation a été enregistrée avec succès ! Merci pour votre avis.",
      );
      onReviewSubmitted(newRev.id);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement de l'avis");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Évaluer votre transaction avec ${targetUserName}`}
      description={`Annonce : "${transaction.listingTitle}"`}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Star Rating */}
        <div className="text-center space-y-2 py-2">
          <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Note globale
          </div>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating || rating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 text-stone-300 hover:scale-115 transition-transform cursor-pointer"
                >
                  <Star
                    className={`w-8 h-8 ${
                      active
                        ? "text-amber-400 fill-amber-400"
                        : "text-stone-300"
                    }`}
                  />
                </button>
              );
            })}
          </div>
          <div className="text-xs font-semibold text-stone-700">
            {rating === 5 && "⭐️⭐️⭐️⭐️⭐️ Exceptionnel / Parfait"}
            {rating === 4 && "⭐️⭐️⭐️⭐️ Très bien"}
            {rating === 3 && "⭐️⭐️⭐️ Conforme"}
            {rating === 2 && "⭐️⭐️ Décevant"}
            {rating === 1 && "⭐️ Médiocre"}
          </div>
        </div>

        {/* Positive Badges */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-700 block">
            {t("transactions.leaveReviewModal.ceQueVousAvezParticulierement")}
          </label>
          <div className="flex flex-wrap gap-2">
            {POSITIVE_BADGES.map((badge) => {
              const isSelected = selectedBadges.includes(badge);
              return (
                <button
                  key={badge}
                  type="button"
                  onClick={() => toggleBadge(badge)}
                  className={`text-sm px-3 py-1.5 rounded-xl border transition-all duration-normal cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-primary/10 text-primary border-primary/40 font-bold shadow-sm"
                      : "bg-stone-50 text-stone-600 border-stone-200/60 hover:bg-stone-100 hover:border-stone-300 shadow-2xs"
                  }`}
                >
                  {isSelected && (
                    <Check className="w-icon-md h-icon-md text-primary" />
                  )}
                  {badge}
                </button>
              );
            })}
          </div>
        </div>

        {/* Text Comment */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-700 block">
            {t("transactions.leaveReviewModal.commentaireDetailleFacultatif")}
          </label>
          <Textarea
            rows={3}
            placeholder={t(
              "transactions.leaveReviewModal.partagezVotreExperienceAvecCet",
            )}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            fullWidth
            onClick={onClose}
            type="button"
            size="md"
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            fullWidth
            type="submit"
            isLoading={isSubmitting}
            size="md"
            leftIcon={<Sparkles className="w-icon-lg h-icon-lg" />}
          >
            Publier mon avis
          </Button>
        </div>
      </form>
    </Modal>
  );
};
