import config from '../../app.config';

describe('app.config', () => {
  it('targets the Android package with minSdk 28', () => {
    expect(config.android?.package).toBe('com.ariiout.customsticker');
    const buildProps = config.plugins?.find(
      (p): p is [string, { android: { minSdkVersion: number } }] =>
        Array.isArray(p) && p[0] === 'expo-build-properties',
    );
    expect(buildProps?.[1].android.minSdkVersion).toBe(28);
  });

  it('requests only INTERNET and blocks storage/camera permissions', () => {
    expect(config.android?.permissions).toEqual(['android.permission.INTERNET']);
    expect(config.android?.blockedPermissions).toEqual(
      expect.arrayContaining([
        'android.permission.CAMERA',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_EXTERNAL_STORAGE',
      ]),
    );
  });
});
