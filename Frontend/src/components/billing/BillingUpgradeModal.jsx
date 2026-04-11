import { useNavigate } from 'react-router-dom';
import Button from '../Button';
import Modal from '../Modal';
import useBillingStore from '../../store/billingStore';

const BillingUpgradeModal = () => {
  const navigate = useNavigate();
  const open = useBillingStore((state) => state.upgradeModalOpen);
  const message = useBillingStore((state) => state.upgradeModalMessage);
  const details = useBillingStore((state) => state.upgradeModalDetails);
  const closeUpgradeModal = useBillingStore((state) => state.closeUpgradeModal);

  const handleViewPlans = () => {
    closeUpgradeModal();
    navigate('/billing');
  };

  const handleOpenSettings = () => {
    closeUpgradeModal();
    navigate('/settings/billing');
  };

  return (
    <Modal open={open} title="Upgrade to continue" onClose={closeUpgradeModal}>
      <p className="text-sm text-text2">
        {message || 'Your current plan limit was reached. Upgrade to continue running AI queries.'}
      </p>

      {details?.limit !== undefined ? (
        <p className="mt-2 text-xs text-text3">
          Usage: {details?.usageCount ?? 0} of {details.limit} queries this period.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" onClick={handleViewPlans}>
          View plans
        </Button>
        <Button type="button" variant="secondary" onClick={handleOpenSettings}>
          Billing settings
        </Button>
      </div>
    </Modal>
  );
};

export default BillingUpgradeModal;
