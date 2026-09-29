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
      {SETTINGS_CATEGORIES.map(({ id, section, title, icon }) => (
        <List.Section key={id} title={section}>
          <List.Item
            title={title}
            description={summaries[id]}
            descriptionNumberOfLines={1}
            accessibilityRole="button"
            left={(props) => <List.Icon {...props} icon={icon} />}
            onPress={() => onOpen(id)}
          />
        </List.Section>
      ))}
      <List.Section title="About">
        <AboutSection />
      </List.Section>
    </>
  );
}
