export async function generateWithRetry(model: any, prompt: string, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      return await model.generateContent(prompt);
    } catch (err: any) {
      const retryable = err?.status === 503 || err?.status === 429;
      if (!retryable || i === tries - 1) throw err;
      // Exponential backoff
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
}
