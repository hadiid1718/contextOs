import Button from '../Button';
import Modal from '../Modal';

const ConfirmRemoveMemberModal = ({ open, member, onClose, onConfirm, isSubmitting }) => {
  return (
    <Modal open={open} onClose={onClose} title="Remove team member">
      <div className="space-y-4">
        <p className="text-sm text-text2">
          This action removes <span className="font-medium text-text">{member?.email || 'this member'}</span> from the organisation.
        </p>
        <p className="rounded-md border border-error/40 bg-error/10 p-3 text-xs text-error">
          Danger zone: this change may revoke access to all org resources.
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="border-error/40 bg-error text-bg hover:bg-error/90" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Removing...' : 'Remove member'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmRemoveMemberModal;

