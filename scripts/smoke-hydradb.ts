import { stableId } from "@/lib/ingestion/id";
import { HydraRepository } from "@/lib/hydradb/repository";

async function main(): Promise<void> {
  try {
    const repository = new HydraRepository();
    if (!(await repository.ready()))
      throw new Error("HYDRADB_UNAVAILABLE HydraDB readiness failed");
    const source = stableId("smoke:source");
    const target = stableId("smoke:target");
    const edge = stableId("smoke:edge");
    const destination = await repository.writeSmokeProof(source, target, edge);
    process.stdout.write(`${JSON.stringify({ ready: true, destination, deleted: true })}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "HydraDB smoke failed.";
    process.stderr.write(
      `${JSON.stringify({ error: { code: message.split(" ")[0] ?? "SMOKE_FAILED", message: message.slice(0, 240) } })}\n`,
    );
    process.exitCode = 1;
  }
}

void main();
