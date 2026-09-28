import { fireEvent, screen } from '@testing-library/react-native';

import NewPacksSettingsScreen from '../../../../app/settings/new-packs';
import { DEFAULT_SETTINGS } from '@/store/createSettingsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { renderWithProviders } from '@/test-utils/render';

beforeEach(() => useSettingsStore.setState(DEFAULT_SETTINGS));

describe('New packs settings', () => {
  it('reads and writes the default author, trimmed', async () => {
    useSettingsStore.setState({ lastPublisher: 'Jane' });
    await renderWithProviders(<NewPacksSettingsScreen />);
    const author = screen.getByLabelText('Default author');
    expect(author.props.value).toBe('Jane');

    await fireEvent.changeText(author, '  Jane Doe ');
    await fireEvent(author, 'blur');
    expect(useSettingsStore.getState().lastPublisher).toBe('Jane Doe');
  });
});
