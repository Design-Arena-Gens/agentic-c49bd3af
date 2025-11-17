'use client';

import { useEffect, useState } from 'react';
import { useAppData } from '@/lib/data-context';
import { Card } from '../common/Card';

interface SettingsFormState {
  firmName: string;
  legalName: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  panNumber: string;
  bankName: string;
  bankAccount: string;
  ifsc: string;
  logoDataUrl: string;
  passwordHint: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: string;
  backupEmail: string;
  backupPhone: string;
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  enableDarkMode: boolean;
  enableNotifications: boolean;
}

const currencies = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
];

export function Settings() {
  const { settings, upsertSettings, resetAllData } = useAppData();
  const [formState, setFormState] = useState<SettingsFormState>({
    firmName: '',
    legalName: '',
    address: '',
    phone: '',
    email: '',
    gstNumber: '',
    panNumber: '',
    bankName: '',
    bankAccount: '',
    ifsc: '',
    logoDataUrl: '',
    passwordHint: '',
    twoFactorEnabled: true,
    twoFactorMethod: 'email',
    backupEmail: '',
    backupPhone: '',
    currency: 'INR',
    currencySymbol: '₹',
    dateFormat: 'yyyy-MM-dd',
    enableDarkMode: false,
    enableNotifications: true,
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    queueMicrotask(() =>
      setFormState((prev) => ({
        ...prev,
        firmName: settings.profile.firmName ?? '',
        legalName: settings.profile.legalName ?? '',
        address: settings.profile.address ?? '',
        phone: settings.profile.phone ?? '',
        email: settings.profile.email ?? '',
        gstNumber: settings.profile.gstNumber ?? '',
        panNumber: settings.profile.panNumber ?? '',
        bankName: settings.profile.bankName ?? '',
        bankAccount: settings.profile.bankAccount ?? '',
        ifsc: settings.profile.ifsc ?? '',
        logoDataUrl: settings.profile.logoDataUrl ?? '',
        passwordHint: settings.security.passwordHint ?? '',
        twoFactorEnabled: settings.security.twoFactorEnabled ?? true,
        twoFactorMethod: settings.security.twoFactorMethod ?? 'email',
        backupEmail: settings.security.backupEmail ?? '',
        backupPhone: settings.security.backupPhone ?? '',
        currency: settings.preferences.currency ?? 'INR',
        currencySymbol: settings.preferences.currencySymbol ?? '₹',
        dateFormat: settings.preferences.dateFormat ?? 'yyyy-MM-dd',
        enableDarkMode: settings.preferences.enableDarkMode ?? false,
        enableNotifications: settings.preferences.enableNotifications ?? true,
      })),
    );
  }, [settings]);

  const handleChange = (field: keyof SettingsFormState, value: string | boolean) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result as string;
        setFormState((prev) => ({ ...prev, logoDataUrl: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await upsertSettings({
      profile: {
        firmName: formState.firmName,
        legalName: formState.legalName,
        address: formState.address,
        phone: formState.phone,
        email: formState.email,
        gstNumber: formState.gstNumber,
        panNumber: formState.panNumber,
        bankName: formState.bankName,
        bankAccount: formState.bankAccount,
        ifsc: formState.ifsc,
        logoDataUrl: formState.logoDataUrl || undefined,
      },
      security: {
        passwordHint: formState.passwordHint,
        twoFactorEnabled: formState.twoFactorEnabled,
        twoFactorMethod: formState.twoFactorMethod as 'email' | 'sms' | 'totp',
        backupEmail: formState.backupEmail,
        backupPhone: formState.backupPhone,
      },
      preferences: {
        currency: formState.currency,
        currencySymbol: formState.currencySymbol,
        dateFormat: formState.dateFormat,
        enableDarkMode: Boolean(formState.enableDarkMode),
        enableNotifications: Boolean(formState.enableNotifications),
      },
    });
    setStatusMessage('Settings updated successfully.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      <Card
        title="Organisation Profile"
        description="Maintain firm identity, statutory registrations, and banking coordinates used across documents."
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Firm Name
              <input
                value={formState.firmName}
                onChange={(event) => handleChange('firmName', event.target.value)}
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Legal Name
              <input
                value={formState.legalName}
                onChange={(event) => handleChange('legalName', event.target.value)}
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              GST Number
              <input
                value={formState.gstNumber}
                onChange={(event) => handleChange('gstNumber', event.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                className="rounded-xl border border-border px-3 py-2 uppercase focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              PAN
              <input
                value={formState.panNumber}
                onChange={(event) => handleChange('panNumber', event.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                className="rounded-xl border border-border px-3 py-2 uppercase focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Contact Number
              <input
                value={formState.phone}
                onChange={(event) => handleChange('phone', event.target.value)}
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                value={formState.email}
                onChange={(event) => handleChange('email', event.target.value)}
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Address
            <textarea
              rows={3}
              value={formState.address}
              onChange={(event) => handleChange('address', event.target.value)}
              className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Bank Name
              <input
                value={formState.bankName}
                onChange={(event) => handleChange('bankName', event.target.value)}
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Account Number
              <input
                value={formState.bankAccount}
                onChange={(event) => handleChange('bankAccount', event.target.value)}
                className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              IFSC
              <input
                value={formState.ifsc}
                onChange={(event) => handleChange('ifsc', event.target.value.toUpperCase())}
                className="rounded-xl border border-border px-3 py-2 uppercase focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-slate-700">Logo</p>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-white shadow-inner">
                {formState.logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={formState.logoDataUrl}
                    alt="Firm logo"
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  <span className="text-xs text-slate-400">No Logo</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="text-xs text-slate-500"
              />
              {formState.logoDataUrl && (
                <button
                  type="button"
                  onClick={() => handleChange('logoDataUrl', '')}
                  className="rounded-xl border border-border px-3 py-1 text-xs font-semibold text-danger transition hover:bg-danger/10"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <SecurityPreferences formState={formState} onChange={handleChange} />
          <ApplicationPreferences formState={formState} onChange={handleChange} />

          {statusMessage && (
            <p className="text-sm font-semibold text-primary">{statusMessage}</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (confirm('This will erase all local application data. Proceed?')) {
                  resetAllData();
                }
              }}
              className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-danger transition hover:bg-danger/20"
            >
              Reset Application
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-gradient-to-r from-primary to-accent px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:shadow-lg"
            >
              Save Settings
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function SecurityPreferences({
  formState,
  onChange,
}: {
  formState: SettingsFormState;
  onChange: (field: keyof SettingsFormState, value: string | boolean) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-slate-50/70 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
        Security
      </h3>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={formState.twoFactorEnabled}
            onChange={(event) => onChange('twoFactorEnabled', event.target.checked)}
            className="h-4 w-4 rounded border border-border accent-primary"
          />
          Enable Two-Factor Authentication
        </label>
        <select
          value={formState.twoFactorMethod}
          onChange={(event) => onChange('twoFactorMethod', event.target.value)}
          className="rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="email">Email OTP</option>
          <option value="sms">SMS OTP</option>
          <option value="totp">Authenticator App</option>
        </select>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Password Hint
          <input
            value={formState.passwordHint}
            onChange={(event) => onChange('passwordHint', event.target.value)}
            className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Backup Email
          <input
            type="email"
            value={formState.backupEmail}
            onChange={(event) => onChange('backupEmail', event.target.value)}
            className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Backup Phone
          <input
            value={formState.backupPhone}
            onChange={(event) => onChange('backupPhone', event.target.value)}
            className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
    </section>
  );
}

function ApplicationPreferences({
  formState,
  onChange,
}: {
  formState: SettingsFormState;
  onChange: (field: keyof SettingsFormState, value: string | boolean) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-slate-50/70 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
        Preferences
      </h3>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Currency
          <select
            value={formState.currency}
            onChange={(event) => {
              const selected = currencies.find((currency) => currency.code === event.target.value);
              onChange('currency', event.target.value);
              onChange('currencySymbol', selected?.symbol ?? '₹');
            }}
            className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Date Format
          <select
            value={formState.dateFormat}
            onChange={(event) => onChange('dateFormat', event.target.value)}
            className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="yyyy-MM-dd">YYYY-MM-DD</option>
            <option value="dd-MM-yyyy">DD-MM-YYYY</option>
            <option value="MM/dd/yyyy">MM/DD/YYYY</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Notifications
          <select
            value={formState.enableNotifications ? 'on' : 'off'}
            onChange={(event) => onChange('enableNotifications', event.target.value === 'on')}
            className="rounded-xl border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="on">Enabled</option>
            <option value="off">Disabled</option>
          </select>
        </label>
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={formState.enableDarkMode}
          onChange={(event) => onChange('enableDarkMode', event.target.checked)}
          className="h-4 w-4 rounded border border-border accent-primary"
        />
        Enable Dark Mode (beta)
      </label>
    </section>
  );
}
