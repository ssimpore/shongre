import React from "react";

const portraitClassName =
  "h-full w-full object-cover object-center motion-surface group-hover:scale-105";

export const AccountTypeBackdrop: React.FC = () => (
  <div
    data-auth-choice-media
    className="absolute inset-0 hidden overflow-hidden xl:block"
  >
    <figure className="group absolute -left-16 top-1/2 h-96 w-64 -translate-y-1/2 -rotate-2 overflow-hidden bg-primary-surface-soft p-3 shadow-sm [border-radius:40%_60%_55%_45%/34%_42%_58%_66%]">
      <div className="h-full w-full overflow-hidden bg-surface-muted [border-radius:42%_58%_53%_47%/32%_40%_60%_68%]">
        <img
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="low"
          height="960"
          loading="lazy"
          src="/images/auth/account-type-professional.webp"
          width="640"
          className={portraitClassName}
        />
      </div>
    </figure>

    <figure className="group absolute -right-16 top-1/2 h-96 w-64 -translate-y-1/2 rotate-2 overflow-hidden bg-primary-surface-soft p-3 shadow-sm [border-radius:60%_40%_45%_55%/42%_34%_66%_58%]">
      <div className="h-full w-full overflow-hidden bg-surface-muted [border-radius:58%_42%_47%_53%/40%_32%_68%_60%]">
        <img
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="low"
          height="960"
          loading="lazy"
          src="/images/auth/account-type-individual.webp"
          width="640"
          className={portraitClassName}
        />
      </div>
    </figure>
  </div>
);
