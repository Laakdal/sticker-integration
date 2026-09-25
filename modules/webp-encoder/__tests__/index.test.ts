import {
  addProgressListener,
  cancel,
  encodeAnimated,
  inspect,
  type EncodeAnimatedOptions,
  type ProgressEvent,
} from '@modules/webp-encoder';

// babel-jest hoists jest.mock above the import; the mock* variables are only read when a test calls the API.
jest.mock('expo', () => ({
  NativeModule: class {},
  requireNativeModule: (name: string) => mockRequireNativeModule(name),
}));

const mockRemove = jest.fn();
const mockNative = {
  encodeAnimated: jest.fn(),
  probe: jest.fn(),
  encodeStatic: jest.fn(),
  makeTrayIcon: jest.fn(),
  inspect: jest.fn(),
  cancel: jest.fn(),
  addListener: jest.fn(() => ({ remove: mockRemove })),
};
const mockRequireNativeModule = jest.fn<typeof mockNative, [string]>(() => mockNative);

const options: EncodeAnimatedOptions = {
  source: 'file:///data/in.gif',
  sourceType: 'gif',
  crop: { x: 0, y: 0, w: 1, h: 1 },
  mode: 'fit',
  trimStartMs: 0,
  trimEndMs: 3000,
  speed: 1,
  playback: 'boomerang',
  rotation: 90,
  flipH: false,
  flipV: true,
  fps: 'auto',
  priority: 'sharp',
  outPath: 'file:///data/out.webp',
  jobId: 'job-1',
};

describe('webp-encoder JS API', () => {
  it('loads the native module lazily, by its registered name', () => {
    // Runs in its own module registry so it is unaffected by whichever test happens to run first
    // (and by whether the shared mockRequireNativeModule was already called by another test): it
    // re-requires the module fresh, whose own `nativeModule` cache starts unset, and checks that
    // requiring it does not call requireNativeModule, but the first API call does — via the call
    // count *delta*, since mockRequireNativeModule itself is shared across isolated registries.
    jest.isolateModules(() => {
      const callsBeforeRequire = mockRequireNativeModule.mock.calls.length;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fresh = require('@modules/webp-encoder') as typeof import('@modules/webp-encoder');
      expect(mockRequireNativeModule.mock.calls.length).toBe(callsBeforeRequire);
      fresh.cancel('job-1');
      expect(mockRequireNativeModule.mock.calls.length).toBe(callsBeforeRequire + 1);
      expect(mockRequireNativeModule).toHaveBeenLastCalledWith('WebpEncoder');
      expect(mockNative.cancel).toHaveBeenCalledWith('job-1');
    });
  });

  it('forwards encodeAnimated options unchanged and returns the native result', async () => {
    const result = { sizeBytes: 400_000, frames: 40, durationMs: 4000, quality: 70, fps: 10 };
    mockNative.encodeAnimated.mockResolvedValueOnce(result);
    await expect(encodeAnimated(options)).resolves.toEqual(result);
    expect(mockNative.encodeAnimated).toHaveBeenCalledWith(options);
  });

  it('passes inspect paths through', async () => {
    const facts = { width: 512, height: 512, animated: false, frameCount: 1, frameDurationsMs: [], sizeBytes: 9, format: 'webp' };
    mockNative.inspect.mockResolvedValueOnce(facts);
    await expect(inspect('/data/s.webp')).resolves.toEqual(facts);
    expect(mockNative.inspect).toHaveBeenCalledWith('/data/s.webp');
  });

  it('delivers progress events of one job only', () => {
    const seen: ProgressEvent[] = [];
    const subscription = addProgressListener('job-1', (e) => seen.push(e));
    // Reads the most recent addListener call rather than the first, so this test does not depend on
    // being the only (or first) caller of addProgressListener in this suite.
    const [eventName, handler] = mockNative.addListener.mock.lastCall as unknown as [string, (e: ProgressEvent) => void];
    expect(eventName).toBe('onProgress');
    handler({ jobId: 'job-2', stage: 'decode', pass: 0, fraction: 0.5 });
    handler({ jobId: 'job-1', stage: 'encode', pass: 1, fraction: 0.25 });
    expect(seen).toEqual([{ jobId: 'job-1', stage: 'encode', pass: 1, fraction: 0.25 }]);
    subscription.remove();
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
