import type { GenerativeModel } from "@google/generative-ai";

export async function generateWithRetry(model: GenerativeModel, prompt: string, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      return await model.generateContent(prompt);
    } catch (error: unknown) {
      const status = typeof error === "object" && error !== null && "status" in error
        ? (error as { status?: number }).status
        : undefined;
      const retryable = status === 503 || status === 429;
      if (!retryable || i === tries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** i));
    }
  }
  throw new Error("Gemini request failed after retries");
}
