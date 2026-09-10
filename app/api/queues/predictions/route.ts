import { QueueClient, type VercelRegion } from "@vercel/queue";

import {
  dispatchPredictionJobsForReadings,
  type PredictionQueueMessage,
} from "@/features/analytics/prediction-dispatcher";
import {
  markPredictionJobFailed,
  processPredictionForReading,
} from "@/features/analytics/prediction-service";

export const runtime = "nodejs";
export const maxDuration = 300;

const defaultPredictionQueueRegion = "iad1" satisfies VercelRegion;
const predictionQueueClient = new QueueClient({
  region: getPredictionQueueRegion(),
});

export const POST = predictionQueueClient.handleCallback<PredictionQueueMessage>(
  async (message, metadata) => {
    const readingId = getReadingId(message);

    if (!readingId) {
      console.error("AEGIS prediction queue message was ignored", {
        messageId: metadata.messageId,
        reason: "Missing readingId",
      });
      return;
    }

    try {
      await processPredictionForReading({ readingId });
    } catch (error) {
      const failure = await markPredictionJobFailed(readingId, error);

      if (!failure.terminal) {
        await dispatchPredictionJobsForReadings([readingId]);
      }
    }
  },
  {
    retry(error, metadata) {
      if (metadata.deliveryCount > 5) {
        console.error("AEGIS prediction queue delivery stopped", {
          error,
          messageId: metadata.messageId,
        });
        return { acknowledge: true };
      }

      return {
        afterSeconds: Math.min(300, 2 ** metadata.deliveryCount * 5),
      };
    },
    visibilityTimeoutSeconds: 300,
  }
);

function getPredictionQueueRegion(): VercelRegion {
  return (
    (process.env.VERCEL_REGION as VercelRegion | undefined) ??
    defaultPredictionQueueRegion
  );
}

function getReadingId(message: unknown) {
  if (!message || typeof message !== "object") {
    return null;
  }

  const readingId = (message as Partial<PredictionQueueMessage>).readingId;

  return typeof readingId === "string" && readingId.trim()
    ? readingId.trim()
    : null;
}
