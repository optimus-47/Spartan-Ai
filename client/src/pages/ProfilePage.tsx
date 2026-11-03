import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState, Panel, StatCard } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api, isApiError, type UserDetails, type UserProfile } from "../lib/api";
import { bmi, computeTargets, DIET_LABELS, formatNumber, GOAL_LABELS, titleCase } from "../lib/fitness";

const activityLevels = [
  ["sedentary", "Mostly sitting"],
  ["light", "Lightly active"],
  ["moderate", "Moderately active"],
  ["active", "Active"],
  ["very_active", "Very active"],
];

const experienceLevels = [
  ["beginner", "Beginner"],
  ["intermediate", "Intermediate"],
  ["advanced", "Advanced"],
];

const equipmentOptions = [
  ["barbell", "Barbell"],
  ["dumbbell", "Dumbbells"],
  ["bench", "Bench"],
  ["pull_up_bar", "Pull-up bar"],
  ["cable_machine", "Cable machine"],
  ["squat_rack", "Squat rack"],
  ["dip_bar", "Dip bars"],
  ["leg_press_machine", "Leg press machine"],
];

interface FormState {
  displayName: string;
  age: string;
  gender: string;
  heightCm: string;
  weightKg: string;
  bodyFatPct: string;
  activityLevel: string;
  goal: string;
  gymExperience: string;
  foodPreference: string;
  sleepHoursTarget: string;
  waterIntakeTargetMl: string;
}

function toForm(profile: UserProfile | null): FormState {
  const text = (value: string | number | null | undefined) => (value === null || value === undefined ? "" : String(value));
  return {
    displayName: text(profile?.displayName),
    age: text(profile?.age),
    gender: text(profile?.gender),
    heightCm: text(profile?.heightCm),
    weightKg: text(profile?.weightKg),
    bodyFatPct: text(profile?.bodyFatPct),
    activityLevel: text(profile?.activityLevel),
    goal: text(profile?.goal),
    gymExperience: text(profile?.gymExperience),
    foodPreference: text(profile?.foodPreference),
    sleepHoursTarget: text(profile?.sleepHoursTarget),
    waterIntakeTargetMl: text(profile?.waterIntakeTargetMl),
  };
}

export function ProfilePage() {
  const { user, profile, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(() => toForm(profile));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [savingEquipment, setSavingEquipment] = useState(false);
  const [equipmentMessage, setEquipmentMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => setForm(toForm(profile)), [profile]);

  useEffect(() => {
    let cancelled = false;
    api
      .getUserDetails()
      .then((result) => {
        if (cancelled) return;
        setDetails(result);
        setEquipment(result.equipment.map((item) => item.equipmentTag));
      })
      .catch(() => {
        if (!cancelled) setDetails({ equipment: [], injuries: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const preview = useMemo(() => {
    const numeric = (value: string) => (value.trim() === "" ? null : Number(value));
    const draft: UserProfile = {
      id: profile?.id ?? "",
      displayName: form.displayName || null,
      age: numeric(form.age),
      gender: form.gender || null,
      heightCm: numeric(form.heightCm),
      weightKg: numeric(form.weightKg),
      bodyFatPct: numeric(form.bodyFatPct),
      activityLevel: form.activityLevel || null,
      goal: form.goal || null,
      gymExperience: form.gymExperience || null,
      foodPreference: form.foodPreference || null,
      sleepHoursTarget: numeric(form.sleepHoursTarget),
      waterIntakeTargetMl: numeric(form.waterIntakeTargetMl),
    };
    return { targets: computeTargets(draft), bmi: bmi(draft) };
  }, [form, profile?.id]);

  const update = (key: keyof FormState) => (value: string) => setForm((previous) => ({ ...previous, [key]: value }));

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const payload: Partial<Omit<UserProfile, "id">> = {};
    const numberField = (key: "age" | "heightCm" | "weightKg" | "bodyFatPct" | "sleepHoursTarget" | "waterIntakeTargetMl") => {
      const raw = form[key].trim();
      if (raw === "") return;
      const value = Number(raw);
      if (!(value > 0)) throw new Error(`${titleCase(key.replace(/([A-Z])/g, "_$1").toLowerCase())} must be a positive number.`);
      payload[key] = key === "age" || key === "waterIntakeTargetMl" ? Math.round(value) : value;
    };
    try {
      (["age", "heightCm", "weightKg", "bodyFatPct", "sleepHoursTarget", "waterIntakeTargetMl"] as const).forEach(numberField);
      if (form.displayName.trim()) payload.displayName = form.displayName.trim().slice(0, 50);
      if (form.gender) payload.gender = form.gender;
      if (form.activityLevel) payload.activityLevel = form.activityLevel;
      if (form.goal) payload.goal = form.goal;
      if (form.gymExperience) payload.gymExperience = form.gymExperience;
      if (form.foodPreference) payload.foodPreference = form.foodPreference;
      await api.updateProfile(payload);
      await refresh();
      setMessage({ text: "Profile saved. Your targets have been recalculated.", ok: true });
    } catch (requestError) {
      setMessage({
        text: isApiError(requestError)
          ? requestError.message
          : requestError instanceof Error
            ? requestError.message
            : "Could not save your profile.",
        ok: false,
      });
    } finally {
      setSaving(false);
    }
  };

  const saveEquipment = async () => {
    setSavingEquipment(true);
    setEquipmentMessage(null);
    try {
      await api.updateEquipment(equipment);
      setEquipmentMessage({ text: "Equipment saved. New AI workout plans will use it.", ok: true });
    } catch (requestError) {
      setEquipmentMessage({
        text: isApiError(requestError) ? requestError.message : "Could not save equipment.",
        ok: false,
      });
    } finally {
      setSavingEquipment(false);
    }
  };

  const name = profile?.displayName || user?.email.split("@")[0] || "Athlete";
  const savedEquipment = details?.equipment.map((item) => item.equipmentTag).sort().join(",") ?? "";
  const equipmentDirty = details !== null && [...equipment].sort().join(",") !== savedEquipment;
  const activeInjuries = details?.injuries.filter((injury) => injury.active) ?? [];

  return (
    <div className="app-page">
      <section className="profile-hero">
        <span aria-hidden="true" className="profile-avatar">
          {name.charAt(0).toUpperCase()}
        </span>
        <div>
          <p className="eyebrow">PROFILE{user?.isGuest ? " · DEMO ACCOUNT" : ""}</p>
          <h1>{name}</h1>
          <div className="hero-chips">
            <span className="chip">🎯 {GOAL_LABELS[profile?.goal ?? ""] ?? "No goal set"}</span>
            <span className="chip">🍽️ {DIET_LABELS[profile?.foodPreference ?? ""] ?? "Any diet"}</span>
            <span className="chip">🏋️ {titleCase(profile?.gymExperience)}</span>
            {!user?.isGuest && user?.email && <span className="chip">✉️ {user.email}</span>}
          </div>
        </div>
        <button
          className="button button-secondary"
          onClick={() => {
            const wasGuest = user?.isGuest === true;
            logout();
            navigate(wasGuest ? "/" : "/login", { replace: true });
          }}
          type="button"
        >
          {user?.isGuest ? "Exit demo" : "Log out"}
        </button>
      </section>

      <section className="stat-grid">
        <StatCard hint="daily target" icon="🔥" label="Calories" value={formatNumber(preview.targets.calories)} />
        <StatCard
          hint={`C ${preview.targets.carbs} g · F ${preview.targets.fat} g`}
          icon="💪"
          label="Protein"
          value={`${preview.targets.protein} g`}
        />
        <StatCard
          hint={preview.targets.bmr ? `BMR ${formatNumber(preview.targets.bmr)} kcal` : "add age, height & weight"}
          icon="📏"
          label="BMI"
          value={preview.bmi ? preview.bmi.toFixed(1) : "—"}
        />
        <StatCard
          hint={`${preview.targets.sleepHours} h sleep`}
          icon="💧"
          label="Water"
          value={`${formatNumber(preview.targets.waterMl / 1000, 1)} L`}
        />
      </section>

      <div className="two-col two-col-wide">
        <Panel eyebrow="PERSONAL DETAILS" title="Edit profile">
          <form className="profile-form" onSubmit={(event) => void save(event)}>
            <label className="field field-span">
              Display name
              <input maxLength={50} onChange={(event) => update("displayName")(event.target.value)} value={form.displayName} />
            </label>
            <label className="field">
              Age
              <input inputMode="numeric" onChange={(event) => update("age")(event.target.value)} type="number" value={form.age} />
            </label>
            <label className="field">
              Gender
              <select onChange={(event) => update("gender")(event.target.value)} value={form.gender}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="field">
              Height (cm)
              <input inputMode="decimal" onChange={(event) => update("heightCm")(event.target.value)} type="number" value={form.heightCm} />
            </label>
            <label className="field">
              Weight (kg)
              <input
                inputMode="decimal"
                onChange={(event) => update("weightKg")(event.target.value)}
                step="0.1"
                type="number"
                value={form.weightKg}
              />
            </label>
            <label className="field">
              Body fat (%)
              <input
                inputMode="decimal"
                onChange={(event) => update("bodyFatPct")(event.target.value)}
                step="0.1"
                type="number"
                value={form.bodyFatPct}
              />
            </label>
            <label className="field">
              Activity level
              <select onChange={(event) => update("activityLevel")(event.target.value)} value={form.activityLevel}>
                <option value="">Select…</option>
                {activityLevels.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Goal
              <select onChange={(event) => update("goal")(event.target.value)} value={form.goal}>
                <option value="">Select…</option>
                {Object.entries(GOAL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Experience
              <select onChange={(event) => update("gymExperience")(event.target.value)} value={form.gymExperience}>
                <option value="">Select…</option>
                {experienceLevels.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Diet
              <select onChange={(event) => update("foodPreference")(event.target.value)} value={form.foodPreference}>
                <option value="">Select…</option>
                {Object.entries(DIET_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Sleep target (h)
              <input
                inputMode="decimal"
                onChange={(event) => update("sleepHoursTarget")(event.target.value)}
                step="0.5"
                type="number"
                value={form.sleepHoursTarget}
              />
            </label>
            <label className="field">
              Water target (ml)
              <input
                inputMode="numeric"
                onChange={(event) => update("waterIntakeTargetMl")(event.target.value)}
                step="250"
                type="number"
                value={form.waterIntakeTargetMl}
              />
            </label>
            <div className="field-span profile-form-actions">
              {message && (
                <p className={message.ok ? "form-success" : "form-error"} role="status">
                  {message.text}
                </p>
              )}
              <button className="button button-primary" disabled={saving} type="submit">
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </Panel>

        <div className="stack">
          <Panel eyebrow="GYM SETUP" title="Equipment">
            <div className="tag-grid">
              {equipmentOptions.map(([value, label]) => {
                const selected = equipment.includes(value);
                return (
                  <button
                    aria-pressed={selected}
                    className={`slot-chip${selected ? " is-selected" : ""}`}
                    key={value}
                    onClick={() =>
                      setEquipment(selected ? equipment.filter((tag) => tag !== value) : [...equipment, value])
                    }
                    type="button"
                  >
                    {selected ? "✓ " : ""}
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="panel-copy">No equipment selected means bodyweight-only plans.</p>
            {equipmentMessage && (
              <p className={equipmentMessage.ok ? "form-success" : "form-error"} role="status">
                {equipmentMessage.text}
              </p>
            )}
            <button
              className="button button-secondary button-full"
              disabled={!equipmentDirty || savingEquipment}
              onClick={() => void saveEquipment()}
              type="button"
            >
              {savingEquipment ? "Saving…" : "Save equipment"}
            </button>
          </Panel>

          <Panel eyebrow="SAFETY" title="Injuries">
            {activeInjuries.length ? (
              <>
                <div className="tag-grid">
                  {activeInjuries.map((injury) => (
                    <span className="pill pill-warn" key={injury.id}>
                      ⚠️ {titleCase(injury.injuryTag)}
                    </span>
                  ))}
                </div>
                <p className="panel-copy">The AI workout generator excludes exercises that stress these areas.</p>
              </>
            ) : (
              <EmptyState icon="🛡️" title={details ? "No active injuries" : "Loading…"}>
                <p>The AI only suggests exercises that are safe for you.</p>
              </EmptyState>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
