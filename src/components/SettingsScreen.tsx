import React, { useEffect, useState } from "react";

interface SettingsScreenProps {
  user: any;
  onBack: () => void;
  onOpenVideoTest: () => void;
  onOpenInbox: () => void;
  onClearOfflineData: () => void;
  onSignOut: () => void;
}

const ToggleRow = ({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
}) => (
  <button
    type="button"
    onClick={() => onToggle(!enabled)}
    className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl p-4 hover:bg-gray-100 transition duration-200"
  >
    <div className="text-left pr-4">
      <div className="text-gray-900 font-medium text-sm">{label}</div>
      <div className="text-gray-500 text-xs">{description}</div>
    </div>
    <span
      className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors duration-200 ${
        enabled ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
          enabled ? "translate-x-6" : "translate-x-0"
        }`}
      ></span>
    </span>
  </button>
);

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  onBack,
  onOpenVideoTest,
  onOpenInbox,
  onClearOfflineData,
  onSignOut,
}) => {
  const [language, setLanguage] = useState("English");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [storageUsage, setStorageUsage] = useState("—");

  const displayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.display_name ||
    (user?.email ? user.email.split("@")[0] : "Leader");

  useEffect(() => {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        setStorageUsage("—");
        return;
      }
      let total = 0;
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        const value = window.localStorage.getItem(key);
        total += key.length + (value?.length ?? 0);
      }
      const kilobytes = total / 1024;
      setStorageUsage(
        `${
          kilobytes > 1024
            ? (kilobytes / 1024).toFixed(2) + " MB"
            : kilobytes.toFixed(1) + " KB"
        }`,
      );
    } catch (error) {
      setStorageUsage("—");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Header - match other management pages */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-200 transition"
        >
          ←
        </button>
        <div className="text-center flex-1">
          <h2 className="text-gray-900 text-lg font-semibold">Settings</h2>
          <p className="text-gray-500 text-xs">Customize FacePace</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3 space-y-4">
        {/* Account */}
        <section className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4 shadow-sm">
          <div className="text-xs tracking-widest text-gray-500 uppercase">Account</div>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-xl text-white">
              {displayName?.charAt(0).toUpperCase() || "L"}
            </div>
            <div>
              <div className="font-semibold text-sm text-gray-900">{displayName}</div>
              <div className="text-gray-500 text-xs">{user?.email}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="w-full bg-red-50 border border-red-200 rounded-2xl py-3 text-red-600 font-semibold hover:bg-red-100 transition"
          >
            Sign Out
          </button>
        </section>

        {/* Quick Actions */}
        <section className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4 shadow-sm">
          <div className="text-xs tracking-widest text-gray-500 uppercase">Quick actions</div>
          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={onOpenVideoTest}
              className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-left hover:bg-gray-100 transition"
            >
              <div className="text-2xl mb-2">🧪</div>
              <div className="font-semibold text-sm text-gray-900">Video test</div>
              <div className="text-xs text-gray-500">Check camera accuracy</div>
            </button>
          </div>
        </section>

        {/* General */}
        <section className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4 shadow-sm">
          <div className="text-xs tracking-widest text-gray-500 uppercase">General</div>
          <div>
            <label className="text-gray-700 text-xs uppercase tracking-widest">
              Language
            </label>
            <div className="mt-2 relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-2xl py-3 px-4 text-gray-900 appearance-none focus:outline-none focus:border-blue-400"
              >
                <option value="English">English</option>
                <option value="Hebrew">Hebrew</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
              </select>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                ↓
              </span>
            </div>
          </div>
          <ToggleRow
            label="Notifications"
            description="Badges + subtle vibration"
            enabled={notificationsEnabled}
            onToggle={setNotificationsEnabled}
          />
          <ToggleRow
            label="Auto sync"
            description="Push local changes when online"
            enabled={autoSyncEnabled}
            onToggle={setAutoSyncEnabled}
          />
          <ToggleRow
            label="Camera haptics"
            description="Vibrate when photo captured"
            enabled={hapticsEnabled}
            onToggle={setHapticsEnabled}
          />
        </section>

        {/* Storage */}
        <section className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4 shadow-sm">
          <div className="text-xs tracking-widest text-gray-500 uppercase">Storage</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm text-gray-900">Offline cache</div>
              <div className="text-gray-500 text-xs">{storageUsage} in use</div>
            </div>
            <button
              type="button"
              onClick={onClearOfflineData}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-gray-100 transition"
            >
              Clear data
            </button>
          </div>
          <p className="text-gray-500 text-xs">
            Clearing cache removes downloaded people, groups, and attendance records from this device. They will re-sync the next time you go online.
          </p>
        </section>
      </div>
    </div>
  );
};
