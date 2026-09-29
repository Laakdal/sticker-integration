import { useState } from 'react';
import { Appbar, Menu } from 'react-native-paper';

interface Props {
  onRename: () => void;
  onDelete: () => void;
}

/** The pack screen's ⋮ header button and its menu. */
export function PackOverflowMenu({ onRename, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const choose = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <Menu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchorPosition="bottom"
      anchor={<Appbar.Action icon="dots-vertical" accessibilityLabel="More options" onPress={() => setOpen(true)} />}
    >
      <Menu.Item leadingIcon="pencil-outline" title="Rename pack" onPress={choose(onRename)} />
      <Menu.Item leadingIcon="delete-outline" title="Delete pack" onPress={choose(onDelete)} />
    </Menu>
  );
}
