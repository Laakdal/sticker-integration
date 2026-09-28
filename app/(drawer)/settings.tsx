import { useRouter } from 'expo-router';

import { Screen } from '@/components';
import { SettingsCategoryList, useSettingsSummaries } from '@/features/settings';

export default function SettingsScreen() {
  const router = useRouter();
  const summaries = useSettingsSummaries();

  return (
    <Screen scroll>
      <SettingsCategoryList summaries={summaries} onOpen={(id) => router.push(`/settings/${id}`)} />
    </Screen>
  );
}
