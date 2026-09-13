import React from "react";
import type { HomepageSectionView } from "../../../domains/homepage/homepage.types";
import { homepageVisibilityClass } from "../../../domains/homepage/homepage.presentation";
import { Container } from "../../../design-system";
import { NewsletterSignup } from "../../newsletter/components/NewsletterSignup";

export const HomeNewsletterSection: React.FC<{
  section: HomepageSectionView;
}> = ({ section }) => (
  <Container
    as="section"
    width="results"
    data-home-newsletter="true"
    className={homepageVisibilityClass(section)}
  >
    <NewsletterSignup source="homepage" />
  </Container>
);
