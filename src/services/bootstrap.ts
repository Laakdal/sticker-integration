export interface BootstrapDeps {
  installedVersion: number;
  targetVersion: number;
  install: () => Promise<unknown>;
  markInstalled: (version: number) => void;
  loadPacks: () => Promise<void>;
}

export async function runBootstrap(deps: BootstrapDeps): Promise<{ installError: Error | null }> {
  let installError: Error | null = null;
  if (deps.installedVersion < deps.targetVersion) {
    try {
      await deps.install();
      deps.markInstalled(deps.targetVersion);
    } catch (e) {
      installError = e instanceof Error ? e : new Error(String(e));
    }
  }
  await deps.loadPacks();
  return { installError };
}
