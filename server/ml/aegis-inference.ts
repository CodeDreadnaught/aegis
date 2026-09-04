import "server-only";

import { join } from "node:path";
import * as ort from "onnxruntime-node";

const modelPath = join(process.cwd(), "models", "ai4i", "v1", "model.onnx");

let sessionPromise: Promise<ort.InferenceSession> | null = null;

function getSession() {
  sessionPromise ??= ort.InferenceSession.create(modelPath, {
    executionProviders: ["cpu"],
  });

  return sessionPromise;
}

export async function runAegisInference(featureVector: number[]) {
  if (featureVector.length !== 8) {
    throw new Error("AEGIS inference requires exactly 8 transformed features.");
  }

  const session = await getSession();
  const tensor = new ort.Tensor(
    "float32",
    Float32Array.from(featureVector),
    [1, featureVector.length]
  );
  const outputs = await session.run({ input: tensor });
  const probabilities = outputs.probabilities;

  if (!probabilities) {
    throw new Error("AEGIS ONNX model did not return probabilities.");
  }

  const probabilityData = probabilities.data;
  const failureProbability = Number(probabilityData[1]);

  if (!Number.isFinite(failureProbability)) {
    throw new Error("AEGIS ONNX model returned an invalid probability.");
  }

  return {
    failureProbability,
  };
}
