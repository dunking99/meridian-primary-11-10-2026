// Meridian — the response contract every new panel route returns.
//
//   { available, reason?, asOf, source, basis?, coverage?, data }
//
// One shape so the frontend can render every panel's states the same way:
// `available:false` with a stated reason is a refusal, not an error, and it
// is never a 500. `coverage.missing` names what could not be measured rather
// than leaving it to be noticed. Nothing here computes anything.

export function ok(data, { source, basis = null, coverage = null, asOf = Date.now(), note = null } = {}) {
  return { available: true, reason: null, asOf, source: source ?? null, basis, coverage, note, data };
}

export function refuse(reason, { source = null, basis = null, coverage = null, asOf = Date.now(), data = null } = {}) {
  return { available: false, reason, asOf, source, basis, coverage, data };
}

/**
 * Run a block and turn an exception into a refusal carrying the message.
 * Used where one failing block must not take its neighbours down with it.
 */
export function guard(fn, { source = null } = {}) {
  try {
    const r = fn();
    return r;
  } catch (e) {
    return refuse(`This block failed to build: ${e?.message ?? e}`, { source });
  }
}

export async function guardAsync(fn, { source = null } = {}) {
  try { return await fn(); }
  catch (e) { return refuse(`This block failed to build: ${e?.message ?? e}`, { source }); }
}

/** Round without turning null into 0 or NaN into a number. */
export const r2 = (x, dp = 2) => (typeof x === 'number' && Number.isFinite(x) ? +x.toFixed(dp) : null);
