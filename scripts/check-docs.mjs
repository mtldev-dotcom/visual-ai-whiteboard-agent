import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "AGENTS.md",
  "README.md",
  "CURRENT_STATUS.md",
  "SESSION_HANDOFF.md",
  "TODO.md",
  "docs/implementation/PHASES.md",
  "docs/implementation/PIPELINE.md",
  "docs/implementation/DEFINITION_OF_DONE.md",
];

const requiredHandoffSections = [
  "## Summary",
  "## Files changed this session",
  "## Checks run",
  "## Checks skipped",
  "## Known issues",
  "## Next recommended task",
];

const missingFiles = requiredFiles.filter((file) => !existsSync(file));

if (missingFiles.length > 0) {
  console.error("Missing required documentation files:");
  for (const file of missingFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

const handoff = readFileSync("SESSION_HANDOFF.md", "utf8");
const missingSections = requiredHandoffSections.filter(
  (section) => !handoff.includes(section),
);

if (missingSections.length > 0) {
  console.error("SESSION_HANDOFF.md is missing required sections:");
  for (const section of missingSections) {
    console.error(`- ${section}`);
  }
  process.exit(1);
}

console.log("Documentation workflow files are present.");
