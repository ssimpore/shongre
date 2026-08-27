import { ProspectingWorkspacePage } from "./ProspectingWorkspacePage";
import { Container } from "../../design-system";

/** Standalone shell backed by the same controller, contracts and adapters as Pro. */
export function ProspectsStandaloneWorkspacePage() {
  return (
    <Container width="page" className="py-5 sm:py-7">
      <ProspectingWorkspacePage entryPoint="STANDALONE" />
    </Container>
  );
}

/** Product-origin route rendered inside the dedicated Prospects app shell. */
export function ProspectsAppWorkspacePage() {
  return (
    <ProspectingWorkspacePage entryPoint="STANDALONE" routeBasePath="/app" />
  );
}
