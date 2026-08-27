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
