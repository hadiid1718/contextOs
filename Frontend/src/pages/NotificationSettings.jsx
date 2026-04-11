import { useEffect, useMemo, useState } from 'react';
import { BellRing, Mail } from 'lucide-react';
import Card from '../components/Card';
import useNotifications from '../hooks/useNotifications';

const typeOptions = [
  {
    key: 'info',
    title: 'Info notifications',
    description: 'General product updates and timeline activity.',
  },
  {
    key: 'success',
    title: 'Success notifications',
    description: 'Completed actions like role updates or invitation acceptance.',
  },
  {
    key: 'warning',
    title: 'Warning notifications',
    description: 'Important reminders like expiring sessions and resets.',
  },
  {
    key: 'error',
    title: 'Error notifications',
    description: 'Critical failures that require immediate attention.',
  },
];

const digestOptions = [
  { value: 'instant', label: 'Instant', hint: 'Email right when an event arrives.' },
  { value: 'hourly', label: 'Hourly', hint: 'Bundle notifications once every hour.' },
  { value: 'daily', label: 'Daily', hint: 'Single daily summary to reduce noise.' },
];

const createDraft = (preferences) => ({
  typePreferences: {
    info: preferences?.typePreferences?.info ?? true,
    success: preferences?.typePreferences?.success ?? true,
    warning: preferences?.typePreferences?.warning ?? true,
    error: preferences?.typePreferences?.error ?? true,
  },
  emailDigestFrequency: preferences?.emailDigestFrequency || 'instant',
});

const NotificationSettings = () => {
  const {
    preferences,
    savePreferences,
    isSavingPreferences,
    notificationError,
    clearNotificationError,
  } = useNotifications();

  const [draft, setDraft] = useState(() => createDraft(preferences));
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    setDraft(createDraft(preferences));
  }, [preferences]);

  const hasChanges = useMemo(() => {
    const current = JSON.stringify(createDraft(preferences));
    const next = JSON.stringify(draft);
    return current !== next;
  }, [draft, preferences]);

  const toggleType = (typeKey) => {
    setSaveMessage('');
    setDraft((current) => ({
      ...current,
      typePreferences: {
        ...current.typePreferences,
        [typeKey]: !current.typePreferences[typeKey],
      },
    }));
  };

  const handleDigestChange = (event) => {
    setSaveMessage('');
    setDraft((current) => ({
      ...current,
      emailDigestFrequency: event.target.value,
    }));
  };

  const handleSave = async () => {
    try {
      await savePreferences(draft);
      setSaveMessage('Notification preferences saved successfully.');
    } catch {
      setSaveMessage('');
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-bg3 via-bg2 to-bg2 p-6">
        <div className="absolute right-[-120px] top-[-120px] h-56 w-56 rounded-full bg-brand/20 blur-3xl" />
        <div className="absolute left-[-80px] bottom-[-100px] h-48 w-48 rounded-full bg-accent2/10 blur-3xl" />

        <div className="relative flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.24em] text-text3">Settings</p>
          <h1 className="text-title-1 text-text">Notification Preferences</h1>
          <p className="max-w-2xl text-sm text-text2">
            Configure which notification types appear in-app and how frequently digest emails are sent.
          </p>
        </div>
      </section>

      {notificationError ? (
        <div className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          <div className="flex items-center justify-between gap-3">
            <span>{notificationError}</span>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs text-error transition hover:bg-error/20"
              onClick={clearNotificationError}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <Card
        title="In-app Notification Types"
        description="Control what appears in the bell drawer and toast stack."
      >
        <div className="space-y-3">
          {typeOptions.map((option) => {
            const enabled = draft.typePreferences[option.key];

            return (
              <div
                key={option.key}
                className="flex items-center justify-between rounded-xl border border-border bg-bg3/40 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-text">{option.title}</p>
                  <p className="text-xs text-text2">{option.description}</p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => toggleType(option.key)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${enabled ? 'bg-brand' : 'bg-surface2'}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card
        title="Email Digest"
        description="Choose how often notification summaries are sent by email."
      >
        <label className="mb-2 inline-flex items-center gap-2 text-sm text-text2" htmlFor="notification-digest-frequency">
          <Mail size={14} />
          Digest frequency
        </label>

        <div className="relative">
          <BellRing className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text3" size={14} />
          <select
            id="notification-digest-frequency"
            value={draft.emailDigestFrequency}
            onChange={handleDigestChange}
            className="w-full rounded-xl border border-border bg-bg3 px-9 py-2.5 text-sm text-text outline-none transition focus:border-border-strong focus:ring-1 focus:ring-brand"
          >
            {digestOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <p className="mt-2 text-xs text-text3">
          {
            digestOptions.find((option) => option.value === draft.emailDigestFrequency)?.hint ||
            'Choose a digest cadence.'
          }
        </p>
      </Card>

      <div className="flex items-center justify-between rounded-xl border border-border bg-bg2 px-4 py-3">
        <p className="text-sm text-text2">{saveMessage || 'Save when you are ready to apply these preferences.'}</p>

        <button
          type="button"
          disabled={!hasChanges || isSavingPreferences}
          onClick={handleSave}
          className="inline-flex items-center rounded-lg border border-border-strong bg-brand px-4 py-2 text-sm font-medium text-bg transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSavingPreferences ? 'Saving…' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;
