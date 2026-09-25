export interface BootstrapDeps {
  installedVersion: number;
  targetVersion: number;
  install: () => Promise<unknown>;
  markInstalled: (version: number) => void;
  loadPacks: () => Promise<void>;
}

export interface BootstrapResult {
  /** Bundled packs could not be installed; the app still works with the user's packs. */
  installError: Error | null;
  /** Packs could not be loaded; the app cannot show anything useful until a retry succeeds. */
  loadError: Error | null;
}

export function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

export async function runBootstrap(deps: BootstrapDeps): Promise<BootstrapResult> {
  let installError: Error | null = null;
  if (deps.installedVersion < deps.targetVersion) {
    try {
      await deps.install();
      deps.markInstalled(deps.targetVersion);
    } catch (e) {
      installError = toError(e);
    }
  }
  let loadError: Error | null = null;
  try {
    await deps.loadPacks();
  } catch (e) {
    loadError = toError(e);
  }
  return { installError, loadError };
}
