import { List } from 'react-native-paper';

import { SETTINGS_CATEGORIES, type SettingsCategoryId } from '../options';
import type { SettingsSummaries } from '../settingsSummaries';
import { AboutSection } from './AboutSection';

interface Props {
  summaries: SettingsSummaries;
  onOpen: (category: SettingsCategoryId) => void;
}

/** The Settings home: one row per category (icon, title, current values), then About. */
export function SettingsCategoryList({ summaries, onOpen }: Props) {
  return (
    <>
      <List.Section>
        {SETTINGS_CATEGORIES.map(({ id, title, icon }) => (
          <List.Item
            key={id}
            title={title}
            description={summaries[id]}
            descriptionNumberOfLines={1}
            accessibilityRole="button"
            left={(props) => <List.Icon {...props} icon={icon} />}
            onPress={() => onOpen(id)}
          />
        ))}
      </List.Section>
      <List.Section title="About">
        <AboutSection />
      </List.Section>
    </>
  );
}
