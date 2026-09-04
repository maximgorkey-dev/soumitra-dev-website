/**
 * Worker entry point. Thin on purpose: all it does is translate messages into
 * runner calls and post whatever the runner emits straight back.
 *
 * `cancel` works because every long stage awaits a timer between frames, which
 * gives this handler a chance to run and set the flag.
 */

import { createRunner } from "./flow/runner.js";

const runner = createRunner((msg, transfer) => self.postMessage(msg, transfer || []));

self.onmessage = async (event) => {
  const msg = event.data || {};
  try {
    switch (msg.t) {
      case "load":
        runner.load(msg.source);
        break;
      case "run":
        await runner.run(msg.opts || {});
        break;
      case "step":
        await runner.step(msg.opts || {});
        break;
      case "rerun":
        await runner.rerun(msg.opts || {});
        break;
      case "pace":
        runner.setPace(msg.pace || {});
        break;
      // Pause, resume and tick have to be handled while a stage is mid-flight,
      // which works for the same reason cancel does: the stage loop awaits.
      case "pause":
        runner.setPaused(true);
        break;
      case "resume":
        runner.setPaused(false);
        break;
      case "tick":
        runner.tick();
        break;
      case "cancel":
        runner.cancel();
        break;
      case "reset":
        runner.reset();
        break;
      default:
        break;
    }
  } catch (err) {
    self.postMessage({ t: "log", level: "error", text: String((err && err.message) || err) });
    self.postMessage({ t: "idle", done: -1, cancelled: true });
  }
};
