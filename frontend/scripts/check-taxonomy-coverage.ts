import {
  buildTaxonomyCoverageReport,
  formatTaxonomyCoverageMarkdown,
} from "../src/domains/taxonomy/taxonomy.coverage";

const report = buildTaxonomyCoverageReport();
const outputFormat = process.argv.includes("--json") ? "json" : "markdown";

if (outputFormat === "json") {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  process.stdout.write(
    [
      `Taxonomy v${report.taxonomyVersion}: ${report.totals.completeLeaves}/${report.totals.publishableLeaves} publishable leaves complete`,
      `Nodes: ${report.totals.nodes}; attributes: ${report.totals.attributes}; demo listings checked: ${report.totals.demoListings}; blocking issues: ${report.totals.blockingIssues}`,
      "",
      formatTaxonomyCoverageMarkdown(report),
      "",
    ].join("\n"),
  );
}

if (report.blockingIssues.length > 0) {
  process.stderr.write(
    `Taxonomy coverage failed:\n${report.blockingIssues.map((issue) => `- ${issue}`).join("\n")}\n`,
  );
  process.exitCode = 1;
}
