import path from "node:path";
import { runSeed } from "@/lib/ingestion/seed";
import { seedFailureRecord } from "@/lib/ingestion/seed-failure";

function parseArgs(args: string[]): { fixtureRoot?: string; dryRun: boolean } {
  const dryRun = args.includes("--dry-run");
  const index = args.indexOf("--fixtures");
  const fixtureRoot = index >= 0 ? args[index + 1] : undefined;
  if (index >= 0 && (!fixtureRoot || fixtureRoot.startsWith("--")))
    throw new Error("INVALID_REQUEST --fixtures requires a directory");
  return { fixtureRoot: fixtureRoot ? path.resolve(fixtureRoot) : undefined, dryRun };
}

async function main(): Promise<void> {
  try {
    const result = await runSeed(parseArgs(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`BlastPath seed failed: ${JSON.stringify(seedFailureRecord(error))}\n`);
    process.exitCode = 1;
  }
}

void main();
