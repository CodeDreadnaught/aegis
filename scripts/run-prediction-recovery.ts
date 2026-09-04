import "dotenv/config";

const endpoint =
  process.env.PREDICTION_WORKER_URL ??
  "http://localhost:3000/api/jobs/predictions/run";
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;
const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error("CRON_SECRET is required to run prediction recovery locally.");
  process.exit(1);
}

const response = await fetch(endpoint, {
  body: JSON.stringify(Number.isFinite(limit) ? { limit } : {}),
  headers: {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  },
  method: "POST",
});

const body = await response.text();

if (!response.ok) {
  console.error(body || `Prediction recovery failed with ${response.status}.`);
  process.exit(1);
}

console.log(body);
