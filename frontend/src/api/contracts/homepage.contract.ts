import type { HomepageConfiguration } from "@shongre/contracts/homepage";
import type {
  HomepageExperience,
  HomepageQuery,
  PublishHomepageInput,
  SaveHomepageDraftInput,
} from "../../domains/homepage/homepage.types";

export interface HomepageServiceContract {
  getHomepage(query: HomepageQuery): Promise<HomepageExperience>;
  getHomepageDraft(query: HomepageQuery): Promise<HomepageConfiguration>;
  saveHomepageDraft(
    input: SaveHomepageDraftInput,
  ): Promise<HomepageConfiguration>;
  previewHomepage(
    configuration: HomepageConfiguration,
    query: HomepageQuery,
  ): Promise<HomepageExperience>;
  publishHomepage(input: PublishHomepageInput): Promise<HomepageConfiguration>;
}
