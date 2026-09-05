import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const disposableDirectoryNames = new Map([
  ["node_modules", "dependency installation output"],
  [".next", "Next.js build output"],
  ["coverage", "coverage output"],
  ["test-results", "test output"],
  ["playwright-report", "Playwright report output"],
  ["blob-report", "Playwright blob report output"],
  [".runtime", "local runtime state"],
  [".expo", "Expo local state"],
  [".expo-shared", "Expo shared local state"],
  [".gradle", "Gradle local state"],
  [".cache", "tool cache"],
  [".turbo", "Turborepo cache"],
  [".parcel-cache", "Parcel cache"],
  ["dist", "compiled output"],
  ["build", "build output"],
  ["out", "export output"],
  ["web-build", "Expo Web build output"],
]);

const disposableFilePatterns = [
  [/^\.DS_Store$/, "macOS metadata"],
  [/^(?:npm|yarn|pnpm)-(?:debug|error)\.log(?:\.\d+)?$/, "package-manager log"],
  [/\.(?:log|tmp|temp|bak|backup|orig|rej)$/i, "temporary or backup file"],
  [/~$/, "editor backup file"],
];

export function trackedArtifactReason(rawPath) {
  const trackedPath = rawPath.replaceAll("\\", "/").replace(/^\.\//, "");
  const segments = trackedPath.split("/").filter(Boolean);

  // Fixtures can intentionally model otherwise-disposable filenames and must
  // be reviewed by their owning tests rather than rejected by path alone.
  if (
    segments.some(
      (segment) => segment === "fixtures" || segment === "__fixtures__",
    )
  ) {
    return null;
  }

  for (const segment of segments.slice(0, -1)) {
    const reason = disposableDirectoryNames.get(segment);
    if (reason) {
      return reason;
    }
  }

  const basename = segments.at(-1) ?? "";
  for (const [pattern, reason] of disposableFilePatterns) {
    if (pattern.test(basename)) {
      return reason;
    }
  }

  return null;
}

export function findTrackedArtifacts(trackedPaths) {
  return trackedPaths.flatMap((trackedPath) => {
    const reason = trackedArtifactReason(trackedPath);
    return reason ? [{ path: trackedPath, reason }] : [];
  });
}

function main() {
  const trackedPaths = execFileSync("git", ["ls-files", "-z"], {
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
  const artifacts = findTrackedArtifacts(trackedPaths);

  if (artifacts.length > 0) {
    console.error("Tracked disposable artifacts are not allowed:");
    for (const artifact of artifacts) {
      console.error(`- ${artifact.path} (${artifact.reason})`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Repository hygiene check passed (${trackedPaths.length} tracked files inspected).`,
  );
}

const isMainModule =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMainModule) {
  main();
}
