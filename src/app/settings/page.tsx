"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lexend } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const lexend = Lexend({ subsets: ["latin"] });

type Settings = {
  name: string;
  email: string;
  avatar: string | null;
  marketplace: string;
  currency: string;
  dispatchTime: string;
  createdAt: string;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return (name.slice(0, 2) || "U").toUpperCase();
}

function getName(user: any) {
  const metadata = user?.user_metadata ?? {};

  return (
    metadata.display_name ||
    metadata.full_name ||
    metadata.name ||
    metadata.user_name ||
    user?.email?.split("@")[0] ||
    "Seller"
  );
}

function getAvatar(user: any) {
  const metadata = user?.user_metadata ?? {};
  return metadata.avatar_url || metadata.picture || null;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);

  const [name, setName] = useState("");
  const [marketplace, setMarketplace] = useState("eBay");
  const [currency, setCurrency] = useState("GBP (£)");
  const [dispatchTime, setDispatchTime] = useState("24 hours");

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [sendingPasswordEmail, setSendingPasswordEmail] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setError(userError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setSettings(null);
        setLoading(false);
        return;
      }

      const metadata = user.user_metadata ?? {};

      const loaded: Settings = {
        name: getName(user),
        email: user.email ?? "",
        avatar: getAvatar(user),
        marketplace: metadata.default_marketplace || "eBay",
        currency: metadata.default_currency || "GBP (£)",
        dispatchTime: metadata.default_dispatch_time || "24 hours",
        createdAt: user.created_at,
      };

      setSettings(loaded);
      setName(loaded.name);
      setAvatarPreview(loaded.avatar);
      setMarketplace(loaded.marketplace);
      setCurrency(loaded.currency);
      setDispatchTime(loaded.dispatchTime);

      setLoading(false);
    }

    void loadUser();
  }, []);

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile pictures must be 5MB or smaller.");
      return;
    }

    setError("");
    setAvatarFile(file);

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
  }

  async function saveProfile() {
    const cleanName = name.trim();

    if (!cleanName) {
      setError("Please enter a name.");
      return;
    }

    if (cleanName.length > 40) {
      setError("Your display name must be 40 characters or less.");
      return;
    }

    setSavingProfile(true);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw new Error(userError.message);
      if (!user) throw new Error("You must be logged in.");

      let avatarUrl = getAvatar(user);

      if (avatarFile) {
        const extension =
          avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";

        const path = `${user.id}/avatar-${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, {
            cacheControl: "3600",
            upsert: true,
            contentType: avatarFile.type,
          });

        if (uploadError) {
          throw new Error(
            `Profile picture upload failed: ${uploadError.message}`
          );
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(path);

        avatarUrl = publicUrl;
      }

      const { data, error: updateError } =
        await supabase.auth.updateUser({
          data: {
            display_name: cleanName,
            avatar_url: avatarUrl,
          },
        });

      if (updateError) throw new Error(updateError.message);

      setSettings((current) =>
        current
          ? {
              ...current,
              name: cleanName,
              avatar: data.user
                ? getAvatar(data.user)
                : avatarUrl,
            }
          : current
      );

      setName(cleanName);
      setAvatarFile(null);
      setMessage("Profile saved successfully.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not save your profile."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePreferences() {
    setSavingPreferences(true);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();

      const { error: updateError } =
        await supabase.auth.updateUser({
          data: {
            default_marketplace: marketplace,
            default_currency: currency,
            default_dispatch_time: dispatchTime,
          },
        });

      if (updateError) throw new Error(updateError.message);

      setSettings((current) =>
        current
          ? {
              ...current,
              marketplace,
              currency,
              dispatchTime,
            }
          : current
      );

      setMessage("Preferences saved successfully.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not save your preferences."
      );
    } finally {
      setSavingPreferences(false);
    }
  }

  async function sendPasswordReset() {
    if (!settings?.email) return;

    setSendingPasswordEmail(true);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          settings.email,
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        );

      if (resetError) throw new Error(resetError.message);

      setMessage(
        "Password reset instructions have been sent to your email."
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not send the password reset email."
      );
    } finally {
      setSendingPasswordEmail(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    setError("");

    const supabase = createClient();

    const { error: signOutError } =
      await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
      setSigningOut(false);
      return;
    }

    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main
        className={`${lexend.className} flex min-h-screen items-center justify-center bg-[#f4f4f5]`}
      >
        <div className="text-sm font-medium text-zinc-400">
          Loading your settings...
        </div>
      </main>
    );
  }

  if (!settings) {
    return (
      <main
        className={`${lexend.className} flex min-h-screen items-center justify-center bg-[#f4f4f5] p-5`}
      >
        <div className="w-full max-w-md rounded-[24px] bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">
            You're not signed in
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Sign in to manage your Reseller AI account.
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex rounded-full bg-[#5540c8] px-6 py-3 text-sm font-semibold text-white"
          >
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`${lexend.className} min-h-screen bg-[#f4f4f5] pb-24 text-[#20202a] lg:pb-8`}
    >
      <div className="mx-auto min-h-screen max-w-[1500px]">
        {/* HEADER */}
        <header className="border-b border-zinc-200/70 bg-white">
          <div className="flex min-h-[88px] items-center justify-between gap-4 px-5 sm:px-8 xl:px-10">
            <div>
              <Link
                href="/"
                className="text-xs font-semibold text-[#5b47cc] hover:text-[#4936b5]"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[28px]">
                Settings
              </h1>

              <p className="mt-1 text-sm text-zinc-400">
                Manage your account, profile and selling preferences.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {settings.avatar ? (
                <img
                  src={settings.avatar}
                  alt={settings.name}
                  className="h-11 w-11 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#5540c8] text-sm font-bold text-white">
                  {getInitials(settings.name)}
                </div>
              )}

              <div className="hidden sm:block">
                <p className="text-sm font-semibold">
                  {settings.name}
                </p>

                <p className="text-xs text-zinc-400">
                  {settings.email}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-5 sm:p-8 xl:p-10">
          {message && (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
              ✓ {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              <p className="font-semibold">
                Something went wrong
              </p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
            {/* PROFILE */}
            <section className="rounded-[26px] border border-zinc-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.025)]">
              <div className="border-b border-zinc-100 p-6 sm:p-7">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eeeafa] text-lg">
                    👤
                  </div>

                  <div>
                    <h2 className="font-semibold">
                      Profile
                    </h2>

                    <p className="text-xs text-zinc-400">
                      Change how your account appears around Reseller AI.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-7">
                {/* PFP */}
                <div>
                  <p className="text-sm font-semibold">
                    Profile picture
                  </p>

                  <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Profile preview"
                        className="h-24 w-24 rounded-full object-cover ring-4 ring-[#eeeafa]"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#5540c8] text-2xl font-bold text-white ring-4 ring-[#eeeafa]">
                        {getInitials(name)}
                      </div>
                    )}

                    <div>
                      <label className="inline-flex cursor-pointer rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold transition hover:bg-zinc-50">
                        Upload picture
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>

                      <p className="mt-2 text-xs text-zinc-400">
                        JPG, PNG or WebP • Maximum 5MB
                      </p>

                      {avatarFile && (
                        <p className="mt-1 text-xs font-medium text-[#5540c8]">
                          New picture selected — click Save Profile.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* NAME */}
                <div className="mt-7">
                  <label className="text-sm font-semibold">
                    Display name
                  </label>

                  <p className="mt-1 text-xs text-zinc-400">
                    This is the name shown on your dashboard.
                  </p>

                  <input
                    value={name}
                    maxLength={40}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    className="mt-3 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-[#5540c8] focus:bg-white"
                    placeholder="Your name"
                  />

                  <div className="mt-1 text-right text-[10px] text-zinc-400">
                    {name.length}/40
                  </div>
                </div>

                {/* EMAIL */}
                <div className="mt-5">
                  <label className="text-sm font-semibold">
                    Email address
                  </label>

                  <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm text-zinc-500">
                    {settings.email}
                  </div>

                  <p className="mt-2 text-xs text-zinc-400">
                    Your login email is managed securely by Supabase Auth.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void saveProfile()}
                  disabled={savingProfile}
                  className="mt-6 rounded-full bg-[#5540c8] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4936b5] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingProfile
                    ? "Saving..."
                    : "Save Profile"}
                </button>
              </div>
            </section>

            {/* SELLING PREFERENCES */}
            <section className="rounded-[26px] border border-zinc-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.025)]">
              <div className="border-b border-zinc-100 p-6 sm:p-7">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-lg">
                    ⚙️
                  </div>

                  <div>
                    <h2 className="font-semibold">
                      Selling Preferences
                    </h2>

                    <p className="text-xs text-zinc-400">
                      Defaults that can be used when creating listings.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-6 sm:p-7">
                <div>
                  <label className="text-sm font-semibold">
                    Default marketplace
                  </label>

                  <select
                    value={marketplace}
                    onChange={(event) =>
                      setMarketplace(event.target.value)
                    }
                    className="mt-3 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-[#5540c8] focus:bg-white"
                  >
                    <option>eBay</option>
                    <option>Vinted</option>
                    <option>Whatnot</option>
                    <option>Facebook Marketplace</option>
                    <option>Depop</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    Default currency
                  </label>

                  <select
                    value={currency}
                    onChange={(event) =>
                      setCurrency(event.target.value)
                    }
                    className="mt-3 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-[#5540c8] focus:bg-white"
                  >
                    <option>GBP (£)</option>
                    <option>USD ($)</option>
                    <option>EUR (€)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    Default dispatch time
                  </label>

                  <select
                    value={dispatchTime}
                    onChange={(event) =>
                      setDispatchTime(event.target.value)
                    }
                    className="mt-3 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-[#5540c8] focus:bg-white"
                  >
                    <option>24 hours</option>
                    <option>48 hours</option>
                    <option>3 working days</option>
                    <option>5 working days</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => void savePreferences()}
                  disabled={savingPreferences}
                  className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  {savingPreferences
                    ? "Saving..."
                    : "Save Preferences"}
                </button>
              </div>
            </section>
          </div>

          {/* SECURITY */}
          <section className="mt-5 rounded-[26px] border border-zinc-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.025)]">
            <div className="border-b border-zinc-100 p-6 sm:p-7">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-lg">
                  🔐
                </div>

                <div>
                  <h2 className="font-semibold">
                    Login & Security
                  </h2>

                  <p className="text-xs text-zinc-400">
                    Manage access to your account.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-px bg-zinc-200 sm:grid-cols-2">
              <div className="bg-white p-6 sm:p-7">
                <p className="text-sm font-semibold">
                  Password
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  Send a secure password reset link to your login email.
                </p>

                <button
                  type="button"
                  onClick={() => void sendPasswordReset()}
                  disabled={sendingPasswordEmail}
                  className="mt-4 rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-semibold transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  {sendingPasswordEmail
                    ? "Sending..."
                    : "Reset Password"}
                </button>
              </div>

              <div className="bg-white p-6 sm:p-7">
                <p className="text-sm font-semibold">
                  Account
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  Member since {formatDate(settings.createdAt)}.
                </p>

                <button
                  type="button"
                  onClick={() => void signOut()}
                  disabled={signingOut}
                  className="mt-4 rounded-full border border-red-100 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                >
                  {signingOut ? "Signing out..." : "Sign Out"}
                </button>
              </div>
            </div>
          </section>

          <p className="mt-8 pb-4 text-center text-xs text-zinc-400">
            Reseller AI • Account Settings • Private Beta
          </p>
        </div>
      </div>

      {/* MOBILE NAV */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {[
            ["⌂", "Home", "/"],
            ["＋", "Add", "/add"],
            ["▣", "Stock", "/inventory"],
            ["◇", "Listings", "/listings"],
            ["£", "Sales", "/sales"],
          ].map(([icon, label, href]) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-14 flex-col items-center justify-center rounded-xl text-[10px] font-semibold text-zinc-400 transition hover:bg-[#f4f4f5]"
            >
              <span className="text-lg leading-none">
                {icon}
              </span>

              <span className="mt-1">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}