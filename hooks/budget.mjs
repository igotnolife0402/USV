// PostToolUse: live tier clock. The Stop hook only measured time after the turn, so the car build (774 s) and the
// double-side fix (359 s) ran past the 300 s medium target with no warning (owner 2026-11-23). This tells the model
// mid-turn, once per step: at 50 % plan to finish, at 80 % ship the working subset and log the rest.
import { readInput, emit, safe, isMain } from './lib.mjs';
import { loadTurnState, saveTurnState, TARGET_S, readTail, parseTurn } from './learn.mjs';

export const STEPS = [
  [0.5, 'half the budget used: no new research; finish the build, then one check'],
  [0.8, 'ship now: run the one check, commit, reply; log anything unfinished as Next'],
  [1.0, 'over target: stop work, commit what passes, reply with Failed/Next for the rest'],
];

// Returns { msg, fired } for the newest step crossed and not yet announced, else null.
export function budgetNote(state, now = Date.now()) {
  const target = TARGET_S[state.tier] || 300;
  if (!state.t) return null;
  const secs = (now - state.t) / 1000, fired = state.fired || 0;
  let idx = -1;
  STEPS.forEach(([f], i) => { if (secs >= f * target) idx = i; });
  if (idx < fired) return null;
  return { fired: idx + 1, msg: `BUDGET ${Math.round(secs)}s of ${target}s (${state.tier || 'medium'}): ${STEPS[idx][1]}.` };
}

if (isMain(import.meta.url)) safe(() => {
  const { session_id, transcript_path } = readInput();
  const state = loadTurnState(session_id);
  // turn start from the transcript (same clock as the Stop hook); the state file's t can be rewritten mid-turn
  const t0 = transcript_path ? parseTurn(readTail(transcript_path, 1_500_000)).t0 : NaN;
  if (Number.isFinite(t0)) { if (state.t0 !== t0) state.fired = 0; state.t = state.t0 = t0; }
  const n = budgetNote(state);
  if (!n) return;
  saveTurnState(session_id, { ...state, fired: n.fired });
  emit({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: n.msg } });
});
