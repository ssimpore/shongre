import React from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Clock3,
  Heart,
  MapPin,
  Radio,
} from "lucide-react";
import type {
  EmploymentCatalog,
  JobPostingCard,
} from "@shongre/contracts/employment";
import { Badge, IconButton } from "../../../design-system";
import { formatSalary, relativeEmploymentDate } from "../employment-format";

export const JobCard: React.FC<{
  job: JobPostingCard;
  catalog?: EmploymentCatalog | null;
  onSave?: (job: JobPostingCard) => void;
  compact?: boolean;
}> = ({ job, catalog, onSave, compact = false }) => (
  <article className="group rounded-card border border-border-base bg-bg-surface p-4 shadow-xs transition-all hover:border-primary-border hover:shadow-card sm:p-5">
    <div className="flex items-start gap-3 sm:gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card border border-border-subtle bg-bg-subtle text-sm font-black text-text-main sm:h-14 sm:w-14">
        {job.employer.logoUrl ? (
          <img
            src={job.employer.logoUrl}
            alt=""
            className="h-full w-full rounded-card object-cover"
          />
        ) : (
          job.employer.name
            .split(/\s+/)
            .map((part) => part[0])
            .join("")
            .slice(0, 3)
            .toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/emploi/offre/${job.slug}`}
              className="line-clamp-2 text-base font-black text-text-main hover:text-primary sm:text-lg"
            >
              {job.title}
            </Link>
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-semibold text-text-secondary">
              <Building2 className="h-icon-xs w-icon-xs shrink-0" aria-hidden="true" />
              <span className="truncate">{job.employer.name}</span>
              {job.employer.isPubliclyVerified ? (
                <BadgeCheck
                  className="h-icon-xs w-icon-xs shrink-0 text-success"
                  aria-label="Employeur vérifié"
                />
              ) : null}
            </p>
          </div>
          {onSave ? (
            <IconButton
              ariaLabel={`${job.saved ? "Retirer" : "Enregistrer"} l’offre ${job.title}`}
              variant="ghost"
              size="sm"
              onClick={() => onSave(job)}
            >
              <Heart
                className={`h-icon-sm w-icon-sm ${job.saved ? "fill-primary text-primary" : ""}`}
              />
            </IconButton>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-icon-xs w-icon-xs" aria-hidden="true" />
            {job.primaryLocation.label}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Radio className="h-icon-xs w-icon-xs" aria-hidden="true" />
            {job.workingArrangementLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BriefcaseBusiness className="h-icon-xs w-icon-xs" aria-hidden="true" />
            {job.contractTypeLabel}
          </span>
        </div>

        <p className="mt-3 text-sm font-black text-text-main">
          {formatSalary(job.salary, catalog)}
        </p>

        {!compact ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {job.isUrgent ? <Badge variant="warning">Recrutement urgent</Badge> : null}
            {job.isFeatured ? <Badge variant="primary">À la une</Badge> : null}
            {job.isSponsored ? <Badge>Placement sponsorisé</Badge> : null}
            <Badge>{job.professionLabel}</Badge>
          </div>
        ) : null}

        <p className="mt-3 flex items-center gap-1.5 border-t border-border-subtle pt-3 text-micro text-text-muted">
          <Clock3 className="h-icon-xs w-icon-xs" aria-hidden="true" />
          Publiée {relativeEmploymentDate(job.publishedAt, catalog?.config.locale)}
        </p>
      </div>
    </div>
  </article>
);
