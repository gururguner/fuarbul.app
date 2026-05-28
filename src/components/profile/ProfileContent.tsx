"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { MainContainer } from "@/components/layout/MainContainer";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CitySelect } from "@/components/ui/CitySelect";
import { Input } from "@/components/ui/Input";
import type { TranslationKey } from "@/lib/i18n";
import { getProfessionLabel, professionOptions } from "@/lib/professions";
import type { FairTaxonomy } from "@/types/fair";

type ProfileUser = {
  birthDate: string;
  city: string;
  email: string;
  gender: string | null;
  name: string;
  phone: string | null;
  profession: string;
  surname: string;
};

type NotificationPreferences = {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  remindFairStarted: boolean;
  remindOneDayBefore: boolean;
  remindSevenDaysBefore: boolean;
  remindThirtyDaysBefore: boolean;
};

type ProfileContentProps = {
  interests: FairTaxonomy[];
  notificationPreferences: NotificationPreferences;
  showDevEmailTest: boolean;
  user: ProfileUser;
};

const genderOptions = [
  { labelKey: "gender.male", value: "MALE" },
  { labelKey: "gender.female", value: "FEMALE" },
  { labelKey: "gender.other", value: "OTHER" },
  { labelKey: "gender.preferNotToSay", value: "PREFER_NOT_TO_SAY" },
] satisfies { labelKey: TranslationKey; value: string }[];

const inputGridClasses = "grid gap-4 sm:grid-cols-2";
const selectClasses =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export function ProfileContent({
  interests,
  notificationPreferences,
  showDevEmailTest,
  user: initialUser,
}: ProfileContentProps) {
  const router = useRouter();
  const { locale, t, taxonomyLabel } = useLanguage();
  const [user, setUser] = useState(initialUser);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success" | null>(
    null,
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setMessageType(null);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/profile", {
        body: JSON.stringify({
          birthDate: getFormValue(formData, "birthDate"),
          city: getFormValue(formData, "city"),
          gender: getFormValue(formData, "gender"),
          name: getFormValue(formData, "name"),
          phone: getFormValue(formData, "phone"),
          profession: getFormValue(formData, "profession"),
          surname: getFormValue(formData, "surname"),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });

      if (!response.ok) {
        setMessage(t("profilePage.updateError"));
        setMessageType("error");
        return;
      }

      const data = (await response.json()) as { user: ProfileUser };

      setUser(data.user);
      setIsEditing(false);
      setMessage(t("profilePage.updateSuccess"));
      setMessageType("success");
      router.refresh();
    } catch {
      setMessage(t("profilePage.updateError"));
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = () => {
    setMessage("");
    setMessageType(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setMessage("");
    setMessageType(null);
    setIsEditing(false);
  };

  return (
    <MainContainer className="py-10 sm:py-14">
      <div className="mb-8 max-w-3xl">
        <Badge variant="accent">{t("profilePage.badge")}</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {t("profilePage.title")}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          {t("profilePage.description")}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>{t("profilePage.accountInfo")}</CardTitle>
              {!isEditing ? (
                <Button onClick={startEditing} size="sm" type="button">
                  {t("profilePage.editProfile")}
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {message ? (
              <p
                className={`mb-4 rounded-lg px-3 py-2 text-sm ${
                  messageType === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {message}
              </p>
            ) : null}

            {isEditing ? (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className={inputGridClasses}>
                  <Input
                    defaultValue={user.name}
                    label={<RequiredLabel label={t("common.name")} />}
                    name="name"
                    required
                  />
                  <Input
                    defaultValue={user.surname}
                    label={<RequiredLabel label={t("common.surname")} />}
                    name="surname"
                    required
                  />
                </div>

                <Input
                  disabled
                  label={t("common.email")}
                  name="email"
                  readOnly
                  value={user.email}
                />

                <div className={inputGridClasses}>
                  <Input
                    defaultValue={user.phone ?? ""}
                    label={t("common.phone")}
                    name="phone"
                    placeholder="05xx xxx xx xx"
                    type="tel"
                  />
                  <CitySelect
                    defaultValue={user.city}
                    label={<RequiredLabel label={t("common.city")} />}
                    name="city"
                    placeholder={t("common.selectCity")}
                    required
                  />
                </div>

                <div className={inputGridClasses}>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      <RequiredLabel label={t("common.profession")} />
                    </span>
                    <select
                      className={selectClasses}
                      defaultValue={user.profession}
                      name="profession"
                      required
                    >
                      {professionOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label[locale]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <Input
                    defaultValue={user.birthDate}
                    label={t("common.birthDate")}
                    name="birthDate"
                    type="date"
                  />
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">
                    {t("common.gender")}
                  </span>
                  <select
                    className={selectClasses}
                    defaultValue={user.gender ?? ""}
                    name="gender"
                  >
                    <option value="">{t("gender.unspecified")}</option>
                    {genderOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </select>
                </label>

                <p className="text-xs leading-5 text-slate-500">
                  {t("registerPage.requiredFieldsNote")}
                </p>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button disabled={isSubmitting} type="submit">
                    {t("common.save")}
                  </Button>
                  <Button
                    onClick={cancelEditing}
                    type="button"
                    variant="outline"
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              </form>
            ) : (
              <ProfileDetails user={user} />
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>{t("nav.interests")}</CardTitle>
                <Button href="/ilgi-alanlarim" size="sm" variant="outline">
                  {t("profilePage.editInterests")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {interests.length ? (
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <Badge key={interest.slug} variant="accent">
                      {taxonomyLabel(interest)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-600">
                  {t("profilePage.noInterests")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("profilePage.notificationPreferences")}</CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationPreferencesForm
                initialPreferences={notificationPreferences}
                showDevEmailTest={showDevEmailTest}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </MainContainer>
  );
}

function NotificationPreferencesForm({
  initialPreferences,
  showDevEmailTest,
}: {
  initialPreferences: NotificationPreferences;
  showDevEmailTest: boolean;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [preferences, setPreferences] = useState(initialPreferences);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success" | null>(
    null,
  );
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const hasReminderEnabled =
    preferences.remindThirtyDaysBefore ||
    preferences.remindSevenDaysBefore ||
    preferences.remindOneDayBefore ||
    preferences.remindFairStarted;
  const showChannelWarning =
    hasReminderEnabled &&
    !preferences.emailEnabled &&
    !preferences.inAppEnabled;
  const options = [
    {
      key: "emailEnabled",
      label: t("profilePage.notificationEmail"),
    },
    {
      key: "inAppEnabled",
      label: t("profilePage.notificationInApp"),
    },
    {
      key: "remindThirtyDaysBefore",
      label: t("profilePage.notificationThirtyDays"),
    },
    {
      key: "remindSevenDaysBefore",
      label: t("profilePage.notificationSevenDays"),
    },
    {
      key: "remindOneDayBefore",
      label: t("profilePage.notificationOneDay"),
    },
    {
      key: "remindFairStarted",
      label: t("profilePage.notificationFairStarted"),
    },
  ] satisfies {
    key: keyof NotificationPreferences;
    label: string;
  }[];

  const togglePreference = (key: keyof NotificationPreferences) => {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
    setMessage("");
    setMessageType(null);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setMessage("");
    setMessageType(null);

    try {
      const response = await fetch("/api/notification-preferences", {
        body: JSON.stringify(preferences),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });

      if (response.status === 401) {
        router.push("/login?next=/profile");
        return;
      }

      if (!response.ok) {
        setMessage(t("profilePage.notificationUpdateError"));
        setMessageType("error");
        return;
      }

      const data = (await response.json()) as {
        preferences: NotificationPreferences;
      };

      setPreferences(data.preferences);
      setMessage(t("profilePage.notificationUpdateSuccess"));
      setMessageType("success");
      router.refresh();
    } catch {
      setMessage(t("profilePage.notificationUpdateError"));
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendTestReminderEmail = async () => {
    setIsSendingTestEmail(true);
    setMessage("");
    setMessageType(null);

    try {
      const response = await fetch("/api/dev/send-test-reminder", {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };

      if (response.status === 401) {
        router.push("/login?next=/profile");
        return;
      }

      if (!response.ok) {
        setMessage(
          data.error === "no_followed_fairs"
            ? t("profilePage.testReminderNoFollowedFairs")
            : t("profilePage.testReminderEmailError"),
        );
        setMessageType("error");
        return;
      }

      setMessage(t("profilePage.testReminderEmailSuccess"));
      setMessageType("success");
    } catch {
      setMessage(t("profilePage.testReminderEmailError"));
      setMessageType("error");
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-slate-600">
        {t("profilePage.notificationDescription")}
      </p>

      <div className="grid gap-2">
        {options.map((option) => (
          <label
            className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white"
            key={option.key}
          >
            <span>{option.label}</span>
            <input
              checked={preferences[option.key]}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
              onChange={() => togglePreference(option.key)}
              type="checkbox"
            />
          </label>
        ))}
      </div>

      {showChannelWarning ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
          {t("profilePage.notificationChannelWarning")}
        </p>
      ) : null}

      {message ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            messageType === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button disabled={isSubmitting} onClick={handleSave} type="button">
          {t("profilePage.saveNotifications")}
        </Button>
        {showDevEmailTest ? (
          <Button
            disabled={isSendingTestEmail}
            onClick={sendTestReminderEmail}
            type="button"
            variant="outline"
          >
            {t("profilePage.sendTestReminderEmail")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ProfileDetails({ user }: { user: ProfileUser }) {
  const { locale, t } = useLanguage();

  return (
    <dl className="grid gap-3 text-sm">
      <ProfileItem label={t("common.name")} value={user.name} />
      <ProfileItem label={t("common.surname")} value={user.surname} />
      <ProfileItem label={t("common.email")} value={user.email} />
      <ProfileItem
        isEmpty={!user.phone}
        label={t("common.phone")}
        value={user.phone || t("common.notAdded")}
      />
      <ProfileItem label={t("common.city")} value={user.city} />
      <ProfileItem
        label={t("common.profession")}
        value={getProfessionLabel(user.profession, locale)}
      />
      <ProfileItem
        isEmpty={!user.birthDate}
        label={t("common.birthDate")}
        value={
          user.birthDate
            ? formatBirthDate(user.birthDate, locale)
            : t("common.notAdded")
        }
      />
      <ProfileItem
        isEmpty={!user.gender}
        label={t("common.gender")}
        value={
          user.gender ? getGenderLabel(user.gender, t) : t("common.notAdded")
        }
      />
    </dl>
  );
}

function RequiredLabel({ label }: { label: string }) {
  return (
    <>
      {label}
      <span aria-hidden="true" className="ml-1 text-red-500">
        *
      </span>
    </>
  );
}

function ProfileItem({
  isEmpty = false,
  label,
  value,
}: {
  isEmpty?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd
        className={`text-right font-semibold ${
          isEmpty ? "text-slate-400" : "text-slate-950"
        }`}
      >
        {value || "-"}
      </dd>
    </div>
  );
}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getGenderLabel(
  gender: string,
  t: (key: TranslationKey) => string,
) {
  const option = genderOptions.find((item) => item.value === gender);

  return option ? t(option.labelKey) : gender;
}

function formatBirthDate(value: string, locale: "en" | "tr") {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
