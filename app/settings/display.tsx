import { Screen } from '@/components';
import { DisplaySettings } from '@/features/settings';
import { useSettingsStore } from '@/store/settingsStore';
import { isDynamicColorSupported } from '@/theme';

export default function DisplaySettingsScreen() {
  const useDynamicColor = useSettingsStore((s) => s.useDynamicColor);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const setSetting = useSettingsStore((s) => s.setSetting);

  return (
    <Screen scroll>
      <DisplaySettings
        themeMode={themeMode}
        onChangeThemeMode={(v) => setSetting('themeMode', v)}
        useDynamicColor={useDynamicColor}
        dynamicColorSupported={isDynamicColorSupported()}
        onChangeUseDynamicColor={(v) => setSetting('useDynamicColor', v)}
        reduceMotion={reduceMotion}
        onChangeReduceMotion={(v) => setSetting('reduceMotion', v)}
      />
    </Screen>
  );
}
