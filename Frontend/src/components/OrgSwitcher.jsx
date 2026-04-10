import { Building2, Check, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import useOrg from '../hooks/useOrg';
import Spinner from './Spinner';

const OrgSwitcher = () => {
  const [open, setOpen] = useState(false);
  const { organisations, currentOrg, setActiveOrg, isLoading, selectOrgPending } = useOrg();

  const activeOrgName = useMemo(() => {
    if (currentOrg?.name) return currentOrg.name;
    if (organisations?.[0]?.name) return organisations[0].name;
    return 'Select organisation';
  }, [currentOrg, organisations]);

  const handleSelect = async (org) => {
    await setActiveOrg(org);
    setOpen(false);
  };

  return (
    <div className="mb-4">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg border border-border bg-bg3 px-3 py-2 text-left text-sm text-text2 transition hover:bg-surface"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex items-center gap-2 truncate">
          <Building2 size={15} />
          <span className="truncate">{activeOrgName}</span>
        </span>
        <ChevronDown size={16} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="animate-slide-in mt-2 rounded-lg border border-border bg-bg2 p-2">
          {isLoading ? (
            <div className="flex items-center justify-center p-3">
              <Spinner size={4} />
            </div>
          ) : null}

          {!isLoading && organisations.length === 0 ? (
            <p className="px-2 py-1 text-xs text-text3">No organisations yet.</p>
          ) : null}

          {!isLoading
            ? organisations.map((org) => {
                const isActive = currentOrg?.org_id === org.org_id;
                return (
                  <button
                    key={org.org_id}
                    type="button"
                    disabled={selectOrgPending}
                    onClick={() => handleSelect(org)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-sm transition ${
                      isActive ? 'bg-brand-light text-brand' : 'text-text2 hover:bg-surface hover:text-text'
                    }`}
                  >
                    <span className="truncate">{org.name}</span>
                    {isActive ? <Check size={15} /> : null}
                  </button>
                );
              })
            : null}
        </div>
      ) : null}
    </div>
  );
};

export default OrgSwitcher;

