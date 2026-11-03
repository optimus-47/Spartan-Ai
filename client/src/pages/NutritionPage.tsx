import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  chartTooltipStyle,
  EmptyState,
  ErrorState,
  LoadingState,
  MacroBar,
  PageHeader,
  Panel,
  ProgressRing,
} from "../components/ui";
import { useAuth } from "../context/AuthContext";
import {
  api,
  isApiError,
  type DetectedFoodItem,
  type Food,
  type MealLogSummary,
  type MealSlot,
} from "../lib/api";
import { computeTargets, DAY_MS, dateKey, formatNumber, MEAL_SLOTS } from "../lib/fitness";

type PanelMode = "add" | "scan" | null;

const SLOT_ICONS: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  snack: "🍎",
  dinner: "🌙",
};

function defaultSlot(): MealSlot {
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 19) return "snack";
  return "dinner";
}

interface ScanRow extends DetectedFoodItem {
  include: boolean;
  grams: number;
}

export function NutritionPage({ initialPanel = null }: { initialPanel?: PanelMode }) {
  const { profile } = useAuth();
  const targets = useMemo(() => computeTargets(profile), [profile]);
  const [date, setDate] = useState(dateKey());
  const [meals, setMeals] = useState<MealLogSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<PanelMode>(initialPanel);

  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState("100");
  const [slot, setSlot] = useState<MealSlot>(defaultSlot());
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");

  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanRows, setScanRows] = useState<ScanRow[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => setPanel(initialPanel), [initialPanel]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setMeals(await api.getMealsForDate(date));
    } catch (requestError) {
      setError(isApiError(requestError) ? requestError.message : "Could not load your meals.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (panel !== "add") return;
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const results = await api.searchFoods(query);
        if (!cancelled) setFoods(results);
      } catch {
        if (!cancelled) setFoods([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, panel]);

  useEffect(() => {
    return () => {
      if (scanPreview) URL.revokeObjectURL(scanPreview);
    };
  }, [scanPreview]);

  const shiftDate = (days: number) => {
    const next = new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS);
    setDate(dateKey(next));
  };

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  };

  const logFood = async () => {
    if (!selectedFood) return;
    const quantityG = Number(grams);
    if (!(quantityG > 0)) {
      setFormError("Enter a portion above 0 g.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await api.logMeal({ logDate: date, mealSlot: slot, foodId: selectedFood.id, quantityG });
      flash(`Added ${quantityG} g ${selectedFood.name} to ${slot}.`);
      setSelectedFood(null);
      setGrams("100");
      await load();
    } catch (requestError) {
      setFormError(isApiError(requestError) ? requestError.message : "Could not log that food.");
    } finally {
      setSaving(false);
    }
  };

  const onPickImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (scanPreview) URL.revokeObjectURL(scanPreview);
    setScanPreview(URL.createObjectURL(file));
    setScanRows([]);
    setFormError("");
    setScanning(true);
    try {
      const detected = await api.scanMeal(file);
      setScanRows(
        detected.map((item) => ({
          ...item,
          include: Boolean(item.matchedFoodId),
          grams: Math.round(item.estimatedGrams),
        })),
      );
      if (detected.length === 0) setFormError("No food was detected. Try a clearer photo.");
    } catch (requestError) {
      setFormError(isApiError(requestError) ? requestError.message : "The AI scan failed. Please retry.");
    } finally {
      setScanning(false);
    }
  };

  const confirmScan = async () => {
    const items = scanRows.filter((row) => row.include && row.grams > 0);
    if (items.length === 0) {
      setFormError("Select at least one detected item.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await api.confirmMealScan({
        logDate: date,
        mealSlot: slot,
        items: items.map((row) => ({
          foodId: row.matchedFoodId ?? undefined,
          foodName: row.matchedFoodName ?? row.detectedName,
          quantityG: row.grams,
          isAiDetected: true,
          confidence: Math.min(1, Math.max(0, row.confidence)),
        })),
      });
      flash(`Logged ${items.length} AI-detected item${items.length > 1 ? "s" : ""}.`);
      setScanRows([]);
      setScanPreview(null);
      await load();
    } catch (requestError) {
      setFormError(isApiError(requestError) ? requestError.message : "Could not save the scan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !meals) return <LoadingState label="Loading nutrition" />;
  if (error || !meals) {
    return <ErrorState message={error || "No data."} onRetry={() => void load()} title="Nutrition could not load." />;
  }

  const totals = meals.totals;
  const macroCalories = [
    { name: "Protein", value: Math.round(totals.protein * 4), color: "var(--protein)" },
    { name: "Carbs", value: Math.round(totals.carbs * 4), color: "var(--carbs)" },
    { name: "Fat", value: Math.round(totals.fat * 9), color: "var(--fat)" },
  ];
  const hasMacros = macroCalories.some((entry) => entry.value > 0);
  const isToday = date === dateKey();
  const preview = selectedFood
    ? {
        calories: (selectedFood.caloriesPer100g * Number(grams || 0)) / 100,
        protein: (selectedFood.proteinPer100g * Number(grams || 0)) / 100,
        carbs: (selectedFood.carbsPer100g * Number(grams || 0)) / 100,
        fat: (selectedFood.fatPer100g * Number(grams || 0)) / 100,
      }
    : null;

  return (
    <div className="app-page">
      <PageHeader
        actions={
          <>
            <button
              className={`button ${panel === "add" ? "button-primary" : "button-secondary"}`}
              onClick={() => setPanel(panel === "add" ? null : "add")}
              type="button"
            >
              + Add food
            </button>
            <button
              className={`button ${panel === "scan" ? "button-primary" : "button-secondary"}`}
              onClick={() => setPanel(panel === "scan" ? null : "scan")}
              type="button"
            >
              📸 AI scan
            </button>
          </>
        }
        eyebrow="NUTRITION"
        lede="Search the catalog or snap a photo. Macros are snapshotted at log time."
        title="Food log"
      />

      <div className="date-nav">
        <button aria-label="Previous day" className="icon-button" onClick={() => shiftDate(-1)} type="button">
          ‹
        </button>
        <strong>
          {isToday
            ? "Today"
            : new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "short",
                timeZone: "UTC",
              })}
        </strong>
        <button
          aria-label="Next day"
          className="icon-button"
          disabled={isToday}
          onClick={() => shiftDate(1)}
          type="button"
        >
          ›
        </button>
        {!isToday && (
          <button className="link-button" onClick={() => setDate(dateKey())} type="button">
            Jump to today
          </button>
        )}
      </div>

      {notice && (
        <div className="toast" role="status">
          ✓ {notice}
        </div>
      )}

      {panel && (
        <Panel
          action={
            <div className="slot-picker" role="group" aria-label="Meal">
              {MEAL_SLOTS.map((value) => (
                <button
                  aria-pressed={slot === value}
                  className={`slot-chip${slot === value ? " is-selected" : ""}`}
                  key={value}
                  onClick={() => setSlot(value)}
                  type="button"
                >
                  {SLOT_ICONS[value]} {value}
                </button>
              ))}
            </div>
          }
          className="entry-panel"
          eyebrow={panel === "add" ? "MANUAL ENTRY" : "AI VISION"}
          title={panel === "add" ? "Add from catalog" : "Scan a meal photo"}
        >
          {panel === "add" ? (
            <div className="add-food">
              <div className="add-food-search">
                <input
                  aria-label="Search foods"
                  autoFocus
                  className="search-input"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search foods: dal, paneer, oats…"
                  value={query}
                />
                <ul className="food-results">
                  {searching && foods.length === 0 && <li className="food-results-empty">Searching…</li>}
                  {!searching && foods.length === 0 && <li className="food-results-empty">No foods match.</li>}
                  {foods.map((food) => (
                    <li key={food.id}>
                      <button
                        className={`food-result${selectedFood?.id === food.id ? " is-selected" : ""}`}
                        onClick={() => setSelectedFood(food)}
                        type="button"
                      >
                        <span>
                          {food.name}
                          <small>{food.cuisineTag ?? "catalog"}</small>
                        </span>
                        <span className="food-result-kcal">
                          {Math.round(food.caloriesPer100g)} kcal
                          <small>
                            P{Math.round(food.proteinPer100g)} · C{Math.round(food.carbsPer100g)} · F
                            {Math.round(food.fatPer100g)} /100g
                          </small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="add-food-detail">
                {selectedFood && preview ? (
                  <>
                    <h3>{selectedFood.name}</h3>
                    <label className="field">
                      Portion (g)
                      <input
                        inputMode="decimal"
                        min="1"
                        onChange={(event) => setGrams(event.target.value)}
                        type="number"
                        value={grams}
                      />
                    </label>
                    <div className="portion-chips">
                      {[50, 100, 150, 200, 250].map((value) => (
                        <button
                          className={`slot-chip${Number(grams) === value ? " is-selected" : ""}`}
                          key={value}
                          onClick={() => setGrams(String(value))}
                          type="button"
                        >
                          {value} g
                        </button>
                      ))}
                    </div>
                    <div className="preview-macros">
                      <div>
                        <strong>{Math.round(preview.calories)}</strong>
                        <span>kcal</span>
                      </div>
                      <div>
                        <strong>{preview.protein.toFixed(1)}</strong>
                        <span>protein</span>
                      </div>
                      <div>
                        <strong>{preview.carbs.toFixed(1)}</strong>
                        <span>carbs</span>
                      </div>
                      <div>
                        <strong>{preview.fat.toFixed(1)}</strong>
                        <span>fat</span>
                      </div>
                    </div>
                    {formError && (
                      <p className="form-error" role="alert">
                        {formError}
                      </p>
                    )}
                    <button
                      className="button button-primary button-full"
                      disabled={saving}
                      onClick={() => void logFood()}
                      type="button"
                    >
                      {saving ? "Logging…" : `Add to ${slot}`}
                    </button>
                  </>
                ) : (
                  <EmptyState icon="🔎" title="Pick a food">
                    <p>Select a result to set the portion and preview macros.</p>
                  </EmptyState>
                )}
              </div>
            </div>
          ) : (
            <div className="scan">
              <input
                accept="image/*"
                capture="environment"
                hidden
                onChange={(event) => void onPickImage(event)}
                ref={fileInput}
                type="file"
              />
              <button
                className={`scan-drop${scanPreview ? " has-image" : ""}`}
                disabled={scanning}
                onClick={() => fileInput.current?.click()}
                type="button"
              >
                {scanPreview ? (
                  <img alt="Meal to scan" src={scanPreview} />
                ) : (
                  <>
                    <span aria-hidden="true">📸</span>
                    <strong>Upload or take a photo</strong>
                    <small>AI identifies each food and estimates the portion</small>
                  </>
                )}
                {scanning && <span className="scan-overlay">Analysing your plate…</span>}
              </button>
              <div className="scan-results">
                {scanRows.length === 0 ? (
                  <EmptyState icon="🤖" title={scanning ? "Detecting foods…" : "Results appear here"}>
                    <p>You review and edit every item before anything is saved.</p>
                  </EmptyState>
                ) : (
                  <>
                    <ul className="scan-list">
                      {scanRows.map((row, index) => (
                        <li className={row.confidence < 0.6 ? "is-low" : ""} key={`${row.detectedName}-${index}`}>
                          <label className="scan-check">
                            <input
                              checked={row.include}
                              onChange={(event) =>
                                setScanRows(
                                  scanRows.map((entry, i) =>
                                    i === index ? { ...entry, include: event.target.checked } : entry,
                                  ),
                                )
                              }
                              type="checkbox"
                            />
                            <span>
                              {row.matchedFoodName ?? row.detectedName}
                              <small>
                                {row.matchedFoodName ? `detected “${row.detectedName}”` : "not in catalog · 0 kcal"} ·{" "}
                                {Math.round(row.confidence * 100)}% sure
                              </small>
                            </span>
                          </label>
                          <input
                            aria-label="Grams"
                            className="scan-grams"
                            min="1"
                            onChange={(event) =>
                              setScanRows(
                                scanRows.map((entry, i) =>
                                  i === index ? { ...entry, grams: Number(event.target.value) } : entry,
                                ),
                              )
                            }
                            type="number"
                            value={row.grams}
                          />
                          <span className="scan-unit">g</span>
                        </li>
                      ))}
                    </ul>
                    {formError && (
                      <p className="form-error" role="alert">
                        {formError}
                      </p>
                    )}
                    <button
                      className="button button-primary button-full"
                      disabled={saving}
                      onClick={() => void confirmScan()}
                      type="button"
                    >
                      {saving ? "Saving…" : `Confirm & log to ${slot}`}
                    </button>
                  </>
                )}
                {scanRows.length === 0 && formError && (
                  <p className="form-error" role="alert">
                    {formError}
                  </p>
                )}
              </div>
            </div>
          )}
        </Panel>
      )}

      <div className="two-col nutrition-top">
        <Panel eyebrow="DAILY TOTALS" title="Energy">
          <div className="fuel-layout">
            <ProgressRing
              label={<strong>{formatNumber(totals.calories)}</strong>}
              max={targets.calories}
              sublabel={`of ${formatNumber(targets.calories)} kcal`}
              value={totals.calories}
            />
            <div className="fuel-macros">
              <MacroBar label="Protein" target={targets.protein} tone="protein" value={totals.protein} />
              <MacroBar label="Carbs" target={targets.carbs} tone="carbs" value={totals.carbs} />
              <MacroBar label="Fat" target={targets.fat} tone="fat" value={totals.fat} />
            </div>
          </div>
        </Panel>
        <Panel eyebrow="CALORIE SOURCES" title="Macro split">
          {hasMacros ? (
            <div className="macro-donut">
              <div className="chart-box chart-box-small">
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart>
                    <Pie
                      data={macroCalories}
                      dataKey="value"
                      innerRadius="62%"
                      nameKey="name"
                      outerRadius="92%"
                      paddingAngle={3}
                      stroke="none"
                    >
                      {macroCalories.map((entry) => (
                        <Cell fill={entry.color} key={entry.name} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`${value} kcal`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="legend">
                {macroCalories.map((entry) => {
                  const total = macroCalories.reduce((sum, item) => sum + item.value, 0) || 1;
                  return (
                    <li key={entry.name}>
                      <span className="legend-dot" style={{ background: entry.color }} />
                      {entry.name}
                      <strong>{Math.round((entry.value / total) * 100)}%</strong>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <EmptyState icon="🥗" title="Log food to see your split" />
          )}
        </Panel>
      </div>

      <section className="meal-grid">
        {MEAL_SLOTS.map((mealSlot) => {
          const items = meals.mealLogs
            .filter((log) => log.mealSlot === mealSlot)
            .flatMap((log) => log.items);
          const slotCalories = items.reduce((sum, item) => sum + item.calories, 0);
          return (
            <Panel
              action={
                <button
                  className="icon-button"
                  aria-label={`Add to ${mealSlot}`}
                  onClick={() => {
                    setSlot(mealSlot);
                    setPanel("add");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  type="button"
                >
                  +
                </button>
              }
              className="meal-card"
              eyebrow={`${SLOT_ICONS[mealSlot]} ${Math.round(slotCalories)} KCAL`}
              key={mealSlot}
              title={<span className="capitalize">{mealSlot}</span>}
            >
              {items.length ? (
                <ul className="food-items">
                  {items.map((item) => (
                    <li key={item.id}>
                      <span>
                        {item.foodName}
                        {item.isAiDetected && <span className="ai-badge">AI</span>}
                        <small>
                          {Math.round(item.quantityG)} g · P{Math.round(item.protein)} C{Math.round(item.carbs)} F
                          {Math.round(item.fat)}
                        </small>
                      </span>
                      <strong>{Math.round(item.calories)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="panel-copy">Nothing logged.</p>
              )}
            </Panel>
          );
        })}
      </section>

      <Panel className="cta-panel" eyebrow="NEED IDEAS?" title="Let AI plan your meals">
        <p className="panel-copy">
          Get a multi-day menu built from real catalog foods that fit your goal and diet, then log it in one tap.
        </p>
        <Link className="button button-primary" to="/nutrition/meal-plan">
          ✨ Open AI meal planner
        </Link>
      </Panel>
    </div>
  );
}
