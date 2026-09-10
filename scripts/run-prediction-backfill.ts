import "dotenv/config";

import {
  countPredictionBackfillCandidates,
  findPredictionBackfillCandidates,
  processPredictionBackfillReading,
} from "@/features/analytics/prediction-backfill";
import { prisma } from "@/server/db/client";

type BackfillOptions = {
  allowProduction: boolean;
  batchSize: number;
  concurrency: number;
  dryRun: boolean;
  limit?: number;
};

type BackfillCounts = {
  completed: number;
  failed: number;
  processed: number;
  skippedExisting: number;
};

const defaultBatchSize = 50;
const defaultConcurrency = 1;
let stopRequested = false;

process.once("SIGINT", requestStop);
process.once("SIGTERM", requestStop);

try {
  const options = parseOptions(process.argv.slice(2));
  await runBackfill(options);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Prediction backfill failed.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

async function runBackfill(options: BackfillOptions) {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for prediction backfill.");
  }

  const databaseTarget = describeDatabaseTarget(databaseUrl);
  const requiresProductionOptIn = isRemoteDatabase(databaseUrl);

  console.log("AEGIS prediction backfill");
  console.log(`Database: ${databaseTarget}`);
  console.log(
    `Mode: ${options.dryRun ? "dry run" : "write"}; batch size ${options.batchSize}; concurrency ${options.concurrency}`
  );

  if (
    !options.dryRun &&
    requiresProductionOptIn &&
    !options.allowProduction &&
    process.env.AEGIS_ALLOW_PRODUCTION_BACKFILL !== "1"
  ) {
    throw new Error(
      "Remote database target detected. Re-run with --allow-production or AEGIS_ALLOW_PRODUCTION_BACKFILL=1 after confirming this is intentional."
    );
  }

  const eligible = await countPredictionBackfillCandidates();
  const planned = options.limit === undefined ? eligible : Math.min(eligible, options.limit);

  console.log(`Eligible readings: ${formatInt(eligible)}`);
  console.log(`Planned this run: ${formatInt(planned)}`);

  if (options.dryRun) {
    console.log("Dry run complete. No predictions or job state were changed.");
    return;
  }

  const counts: BackfillCounts = {
    completed: 0,
    failed: 0,
    processed: 0,
    skippedExisting: 0,
  };

  while (!stopRequested && shouldContinue(options, counts.processed)) {
    const remainingLimit =
      options.limit === undefined
        ? options.batchSize
        : Math.min(options.batchSize, options.limit - counts.processed);

    if (remainingLimit <= 0) {
      break;
    }

    const candidates = await findPredictionBackfillCandidates({
      take: remainingLimit,
    });

    if (!candidates.length) {
      break;
    }

    for (let index = 0; index < candidates.length; index += options.concurrency) {
      if (stopRequested) {
        break;
      }

      const chunk = candidates.slice(index, index + options.concurrency);
      const outcomes = await Promise.all(
        chunk.map((candidate) => processPredictionBackfillReading(candidate.id))
      );

      for (const outcome of outcomes) {
        counts.processed += 1;

        if (outcome.status === "completed") {
          counts.completed += 1;
        } else if (outcome.status === "skipped") {
          counts.skippedExisting += 1;
        } else {
          counts.failed += 1;
        }
      }
    }

    console.log(
      `Processed ${formatInt(counts.processed)} / ${formatInt(planned)} ` +
        `(completed ${formatInt(counts.completed)}, skipped ${formatInt(counts.skippedExisting)}, failed ${formatInt(counts.failed)})`
    );
  }

  const remaining = await countPredictionBackfillCandidates();

  if (stopRequested) {
    console.log("Stop requested. Current work finished and backfill stopped safely.");
  }

  console.log("Backfill summary");
  console.log(`Completed: ${formatInt(counts.completed)}`);
  console.log(`Skipped existing predictions: ${formatInt(counts.skippedExisting)}`);
  console.log(`Failed: ${formatInt(counts.failed)}`);
  console.log(`Remaining eligible readings: ${formatInt(remaining)}`);
}

function parseOptions(args: string[]): BackfillOptions {
  if (args.includes("--help")) {
    console.log([
      "Usage: bun run jobs:predictions:backfill [options]",
      "",
      "Options:",
      "  --batch-size <n>       Number of readings to select per database batch. Default: 50",
      "  --limit <n>            Maximum readings to process in this run. Omit for all eligible readings.",
      "  --concurrency <n>      Concurrent predictions inside each batch. Default: 1",
      "  --dry-run              Report eligible work without writing prediction state.",
      "  --allow-production     Required for write runs against remote database targets.",
    ].join("\n"));
    process.exit(0);
  }

  return {
    allowProduction: args.includes("--allow-production"),
    batchSize: readPositiveIntegerOption(args, "--batch-size", defaultBatchSize),
    concurrency: readPositiveIntegerOption(args, "--concurrency", defaultConcurrency),
    dryRun: args.includes("--dry-run"),
    limit: readOptionalPositiveIntegerOption(args, "--limit"),
  };
}

function readOptionalPositiveIntegerOption(args: string[], name: string) {
  const value = readOptionValue(args, name);

  if (value === undefined) {
    return undefined;
  }

  return parsePositiveInteger(value, name);
}

function readPositiveIntegerOption(args: string[], name: string, fallback: number) {
  const value = readOptionValue(args, name);

  if (value === undefined) {
    return fallback;
  }

  return parsePositiveInteger(value, name);
}

function readOptionValue(args: string[], name: string) {
  const equalsArg = args.find((arg) => arg.startsWith(`${name}=`));

  if (equalsArg) {
    return equalsArg.slice(name.length + 1);
  }

  const index = args.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function parsePositiveInteger(value: string | undefined, name: string) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function shouldContinue(options: BackfillOptions, processed: number) {
  return options.limit === undefined || processed < options.limit;
}

function describeDatabaseTarget(connectionString: string) {
  try {
    const url = new URL(connectionString);
    const user = url.username ? "<user>@" : "";

    return `${url.protocol}//${user}${url.host}${url.pathname}`;
  } catch {
    return "unparseable DATABASE_URL";
  }
}

function isRemoteDatabase(connectionString: string) {
  try {
    const host = new URL(connectionString).hostname.toLowerCase();

    return !(
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      isPrivate172Address(host)
    );
  } catch {
    return true;
  }
}

function isPrivate172Address(host: string) {
  const match = /^172\.(\d+)\./.exec(host);

  if (!match) {
    return false;
  }

  const secondOctet = Number.parseInt(match[1], 10);

  return secondOctet >= 16 && secondOctet <= 31;
}

function requestStop() {
  if (stopRequested) {
    return;
  }

  stopRequested = true;
  console.log("Stop requested. Finishing current work before exiting...");
}

function formatInt(value: number) {
  return value.toLocaleString("en-GB");
}