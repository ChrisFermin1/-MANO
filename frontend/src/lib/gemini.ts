import type { GenerativeModel } from "@google/generative-ai";

// Gemini's speed jumps around: the same request can take 1s or 30s. So instead of waiting on one
// slow request, race a second one:
//   - no answer after 4s → send a 2nd request (the 1st keeps going); the first answer wins, the other is cancelled
//   - "busy" (429/503) → one quick retry after 1s
//   - everything stops at 20s
// At most 2 requests per call, so it never loops.
const SECOND_REQUEST_AFTER_MS = 4_000;
const GIVE_UP_AFTER_MS = 20_000;
const BUSY_RETRY_AFTER_MS = 1_000;

const statusOf = (error: unknown) =>
  typeof error === "object" && error !== null && "status" in error ? (error as { status?: number }).status : undefined;

// prompt: text, or text + image parts (Escanear una nota)
export function generateWithRetry(model: GenerativeModel, prompt: Parameters<GenerativeModel["generateContent"]>[0]) {
  type Result = Awaited<ReturnType<GenerativeModel["generateContent"]>>;
  return new Promise<Result>((resolve, reject) => {
    const controllers: AbortController[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let settled = false;
    let pending = 0;
    let lastError: unknown = null;

    const finish = (done: () => void) => {
      if (settled) return;
      settled = true;
      timers.forEach(clearTimeout);
      controllers.forEach((c) => c.abort()); // cancel the request that lost the race
      done();
    };

    const send = (which: "first" | "second") => {
      if (settled || controllers.length >= 2) return;
      const controller = new AbortController();
      controllers.push(controller);
      pending++;
      const started = Date.now();
      model.generateContent(prompt, { signal: controller.signal, timeout: GIVE_UP_AFTER_MS }).then(
        (result) => {
          if (which === "second") console.info(`Gemini: the second request won (${Date.now() - started}ms)`);
          finish(() => resolve(result));
        },
        (error: unknown) => {
          pending--;
          lastError = error;
          const busy = statusOf(error) === 429 || statusOf(error) === 503;
          if (busy && controllers.length < 2) {
            timers.push(setTimeout(() => send("second"), BUSY_RETRY_AFTER_MS));
            return;
          }
          // a real error (bad request, wrong key…): no point in a second try
          if (!busy && controllers.length < 2) return finish(() => reject(error));
          if (pending === 0) finish(() => reject(lastError));
        },
      );
    };

    send("first");
    timers.push(setTimeout(() => send("second"), SECOND_REQUEST_AFTER_MS));
    timers.push(
      setTimeout(
        () => finish(() => reject(Object.assign(new Error("Gemini took too long"), { status: 504 }))),
        GIVE_UP_AFTER_MS,
      ),
    );
  });
}
