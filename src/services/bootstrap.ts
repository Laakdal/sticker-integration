export interface BootstrapDeps {
  /** Tidies data left by older app versions. Best effort: a failure never blocks loading. */
  cleanUp: () => Promise<unknown>;
  loadPacks: () => Promise<void>;
}

export interface BootstrapResult {
  /** Packs could not be loaded; the app cannot show anything useful until a retry succeeds. */
  loadError: Error | null;
}

export function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

export async function runBootstrap(deps: BootstrapDeps): Promise<BootstrapResult> {
  try {
    await deps.cleanUp();
  } catch {
    // Anything left behind is quarantined by the load below and reported on Home.
  }
  let loadError: Error | null = null;
  try {
    await deps.loadPacks();
  } catch (e) {
    loadError = toError(e);
  }
  return { loadError };
}
