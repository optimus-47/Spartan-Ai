import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, isApiError } from "../lib/api";

const steps = [
  "Your name",
  "The basics",
  "Your training",
  "Injuries",
  "Equipment",
  "Food preference",
];

const activityLevels = [
  ["sedentary", "Mostly sitting"],
  ["light", "Lightly active"],
  ["moderate", "Moderately active"],
  ["active", "Active"],
  ["very_active", "Very active"],
];

const goals = [
  ["fat_loss", "Lose fat"],
  ["muscle_gain", "Gain muscle"],
  ["maintenance", "Maintain"],
  ["strength", "Build strength"],
  ["general_fitness", "General fitness"],
];

const experienceLevels = [
  ["beginner", "Beginner"],
  ["intermediate", "Intermediate"],
  ["advanced", "Advanced"],
];

const injuries = [
  ["shoulder", "Shoulder"],
  ["elbow", "Elbow"],
  ["wrist", "Wrist"],
  ["knee", "Knee"],
  ["lower_back", "Lower back"],
  ["hamstring", "Hamstring"],
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

const foodPreferences = [
  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
  ["non_vegetarian", "Omnivore"],
  ["eggetarian", "Eggetarian"],
];

interface ChoiceProps {
  label: string;
  onClick: () => void;
  selected: boolean;
}

function Choice({ label, onClick, selected }: ChoiceProps) {
  return (
    <button
      aria-pressed={selected}
      className={`onboarding-choice${selected ? " is-selected" : ""}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function ChoiceGroup({
  choices,
  onChange,
  value,
}: {
  choices: string[][];
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="onboarding-choices">
      {choices.map(([choice, label]) => (
        <Choice
          key={choice}
          label={label}
          onClick={() => onChange(choice)}
          selected={value === choice}
        />
      ))}
    </div>
  );
}

function MultiChoiceGroup({
  choices,
  onChange,
  values,
}: {
  choices: string[][];
  onChange: (value: string) => void;
  values: string[];
}) {
  return (
    <div className="onboarding-choices">
      {choices.map(([choice, label]) => (
        <Choice
          key={choice}
          label={label}
          onClick={() => onChange(choice)}
          selected={values.includes(choice)}
        />
      ))}
    </div>
  );
}

export function OnboardingPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [goal, setGoal] = useState("");
  const [gymExperience, setGymExperience] = useState("");
  const [injuryTags, setInjuryTags] = useState<string[]>([]);
  const [equipmentTags, setEquipmentTags] = useState<string[]>([]);
  const [foodPreference, setFoodPreference] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleValue = (
    values: string[],
    value: string,
    setValues: (next: string[]) => void,
  ) => {
    setValues(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    );
  };

  const renderStep = (): ReactNode => {
    switch (step) {
      case 0:
        return (
          <label className="field">
            <span>What should we call you?</span>
            <input
              autoComplete="given-name"
              maxLength={50}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              value={displayName}
            />
          </label>
        );
      case 1:
        return (
          <div className="onboarding-fields">
            <label className="field">
              <span>Age</span>
              <input
                max={120}
                min={13}
                onChange={(event) => setAge(event.target.value)}
                type="number"
                value={age}
              />
            </label>
            <label className="field">
              <span>Gender (optional)</span>
              <select
                onChange={(event) => setGender(event.target.value)}
                value={gender}
              >
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non_binary">Non-binary</option>
              </select>
            </label>
            <label className="field">
              <span>Height (cm)</span>
              <input
                max={250}
                min={100}
                onChange={(event) => setHeightCm(event.target.value)}
                type="number"
                value={heightCm}
              />
            </label>
            <label className="field">
              <span>Weight (kg)</span>
              <input
                max={400}
                min={25}
                onChange={(event) => setWeightKg(event.target.value)}
                type="number"
                value={weightKg}
              />
            </label>
          </div>
        );
      case 2:
        return (
          <div className="onboarding-fields">
            <fieldset className="onboarding-fieldset">
              <legend>How active are you day to day?</legend>
              <ChoiceGroup
                choices={activityLevels}
                onChange={setActivityLevel}
                value={activityLevel}
              />
            </fieldset>
            <fieldset className="onboarding-fieldset">
              <legend>What are you working toward?</legend>
              <ChoiceGroup
                choices={goals}
                onChange={setGoal}
                value={goal}
              />
            </fieldset>
            <fieldset className="onboarding-fieldset">
              <legend>What is your training experience?</legend>
              <ChoiceGroup
                choices={experienceLevels}
                onChange={setGymExperience}
                value={gymExperience}
              />
            </fieldset>
          </div>
        );
      case 3:
        return (
          <>
            <p className="onboarding-help">
              Select any areas that need extra care. You can leave this blank.
            </p>
            <MultiChoiceGroup
              choices={injuries}
              onChange={(value) =>
                toggleValue(injuryTags, value, setInjuryTags)
              }
              values={injuryTags}
            />
          </>
        );
      case 4:
        return (
          <>
            <p className="onboarding-help">
              Choose the equipment you can use. Select none for bodyweight
              training.
            </p>
            <MultiChoiceGroup
              choices={equipmentOptions}
              onChange={(value) =>
                toggleValue(equipmentTags, value, setEquipmentTags)
              }
              values={equipmentTags}
            />
          </>
        );
      default:
        return (
          <ChoiceGroup
            choices={foodPreferences}
            onChange={setFoodPreference}
            value={foodPreference}
          />
        );
    }
  };

  const finishOnboarding = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName || trimmedName.length > 50) {
      setStep(0);
      setError("Enter a name between 1 and 50 characters.");
      return;
    }

    const optionalNumbers = [
      ["Age", age, 13, 120, true],
      ["Height", heightCm, 100, 250, false],
      ["Weight", weightKg, 25, 400, false],
    ] as const;
    for (const [label, rawValue, min, max, integer] of optionalNumbers) {
      if (!rawValue) continue;
      const value = Number(rawValue);
      if (
        !Number.isFinite(value) ||
        value < min ||
        value > max ||
        (integer && !Number.isInteger(value))
      ) {
        setStep(1);
        setError(`Enter a valid ${label.toLowerCase()}.`);
        return;
      }
    }

    if (!activityLevel || !goal || !gymExperience || !foodPreference) {
      setError("Choose an option in each section before finishing.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api.updateProfile({
        displayName: trimmedName,
        ...(age ? { age: Number(age) } : {}),
        ...(gender ? { gender } : {}),
        ...(heightCm ? { heightCm: Number(heightCm) } : {}),
        ...(weightKg ? { weightKg: Number(weightKg) } : {}),
        activityLevel,
        goal,
        gymExperience,
        foodPreference,
      });
      await api.updateEquipment(equipmentTags);
      for (const injuryTag of injuryTags) {
        await api.addInjury(injuryTag);
      }

      let planNotice: string | undefined;
      try {
        await api.generateWorkoutPlan("upper_lower");
      } catch (planError) {
        if (
          isApiError(planError) &&
          planError.code === "NO_ELIGIBLE_EXERCISES"
        ) {
          planNotice =
            "Your injuries and equipment leave no safe exercises for this plan. Add equipment or review your injury selections, then generate a plan.";
        } else if (isApiError(planError) && [502, 503].includes(planError.status)) {
          planNotice =
            "Your profile is saved, but plan generation is temporarily unavailable. Try again from your dashboard.";
        } else if (isApiError(planError)) {
          planNotice = `Your profile is saved, but we could not generate a plan: ${planError.message}`;
        } else {
          planNotice =
            "Your profile is saved, but we could not generate a plan. Try again from your dashboard.";
        }
      }

      await refresh();
      navigate("/dashboard", {
        replace: true,
        state: planNotice ? { planNotice } : undefined,
      });
    } catch (requestError) {
      setError(
        isApiError(requestError)
          ? requestError.message
          : "We could not save your profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = () => {
    setError("");
    if (step === 0 && !displayName.trim()) {
      setError("Enter a name to continue.");
      return;
    }
    if (step === steps.length - 1) {
      void finishOnboarding();
      return;
    }
    setStep((current) => current + 1);
  };

  return (
    <section className="auth-card onboarding-card">
      <p className="eyebrow">YOUR FIELD LOG · {step + 1} OF {steps.length}</p>
      <h1>{steps[step]}</h1>
      <div aria-live="polite" className="onboarding-step">
        {renderStep()}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="onboarding-actions">
        {step > 0 && (
          <button
            className="button button-secondary"
            disabled={saving}
            onClick={() => {
              setError("");
              setStep((current) => current - 1);
            }}
            type="button"
          >
            Back
          </button>
        )}
        <button
          className="button button-primary"
          disabled={saving}
          onClick={handleContinue}
          type="button"
        >
          {saving
            ? "Saving your field log..."
            : step === steps.length - 1
              ? "Finish setup"
              : "Continue"}
        </button>
      </div>
    </section>
  );
}
