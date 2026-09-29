import { PackDetailsDialog, type PackDetailsValues } from './PackDetailsDialog';

interface Props {
  visible: boolean;
  /** Pre-fills the author field; the pack name always starts empty. */
  initialPublisher: string;
  pending: boolean;
  onCancel: () => void;
  onCreate: (values: PackDetailsValues) => void;
}

export function NewPackDialog({ visible, initialPublisher, pending, onCancel, onCreate }: Props) {
  return (
    <PackDetailsDialog
      visible={visible}
      title="New pack"
      confirmLabel="Create"
      initialName=""
      initialPublisher={initialPublisher}
      pending={pending}
      onCancel={onCancel}
      onConfirm={onCreate}
    />
  );
}
