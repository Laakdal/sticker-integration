export interface BootstrapDeps {
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
  let loadError: Error | null = null;
  try {
    await deps.loadPacks();
  } catch (e) {
    loadError = toError(e);
  }
  return { loadError };
}
