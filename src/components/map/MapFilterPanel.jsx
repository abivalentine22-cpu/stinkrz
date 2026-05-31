import React, { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

const SHOWER_OPTIONS = ["Any", "Daily", "Every other day", "Twice a week", "Weekly", "When inspired", "Classified"];
const LOOKING_FOR_OPTIONS = ["Any", "Casual chat", "Meetup", "Just browsing", "Friends", "Whatever happens"];
const SCENT_OPTIONS = ["All", "Fresh", "Musky", "Ripe", "Earthy", "Neutral"];
const GENDER_OPTIONS = ["Any", "Man", "Woman", "Non-binary", "Genderfluid", "Agender", "Prefer not to say"];
const SEXUALITY_OPTIONS = ["Any", "Straight", "Gay", "Lesbian", "Bisexual", "Pansexual", "Asexual", "Queer", "Prefer not to say"];

const DEFAULT_FILTERS = {
  minAge: "", maxAge: "", maxDistance: "",
  showerFrequency: "Any", lookingFor: "Any",
  scentCategory: "All", gender: "Any", sexuality: "Any",
};

export default function MapFilterPanel({ filters, onChange }) {
  const [open, setOpen] = useState(false);

  const active =
    filters.minAge !== "" || filters.maxAge !== "" ||
    filters.maxDistance !== "" || filters.showerFrequency !== "Any" ||
    filters.lookingFor !== "Any" || filters.scentCategory !== "All" ||
    filters.gender !== "Any" || filters.sexuality !== "Any";

  const reset = () => onChange(DEFAULT_FILTERS);

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "5px",
          padding: "5px 12px", borderRadius: "9999px",
          fontSize: "12px", fontFamily: "var(--font-body)",
          whiteSpace: "nowrap", cursor: "pointer",
          background: active ? "rgba(124,58,237,0.85)" : "rgba(15,12,35,0.7)",
          color: active ? "#fff" : "#94a3b8",
          border: active ? "1px solid rgba(167,139,250,0.5)" : "1px solid rgba(255,255,255,0.1)",
          boxShadow: active ? "0 0 12px rgba(124,58,237,0.35)" : "none",
          transition: "all 0.15s ease",
          backdropFilter: "blur(8px)",
          flexShrink: 0,
        }}
      >
        <SlidersHorizontal size={12} />
        Filters{active ? " •" : ""}
      </button>

      {open && (
        <div style={{
          position: "fixed", top: "64px", left: "14px", zIndex: 1100,
          background: "rgba(20,17,40,0.97)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "16px", padding: "16px", width: "240px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)", backdropFilter: "blur(12px)",
          maxHeight: "80vh", overflowY: "auto",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "14px", color: "#e2e8f0" }}>Filters</span>
            <div style={{ display: "flex", gap: "8px" }}>
              {active && (
                <button onClick={reset} style={{ fontSize: "11px", color: "#a78bfa", fontFamily: "var(--font-body)", background: "none", border: "none", cursor: "pointer" }}>
                  Reset
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>
                <X size={14} />
              </button>
            </div>
          </div>

          <Field label="Scent Category">
            <ScentChips value={filters.scentCategory} onChange={v => onChange({ ...filters, scentCategory: v })} />
          </Field>

          <Field label="Age Range">
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <NumberInput value={filters.minAge} onChange={v => onChange({ ...filters, minAge: v })} placeholder="Min" />
              <span style={{ color: "#64748b", fontSize: "12px" }}>–</span>
              <NumberInput value={filters.maxAge} onChange={v => onChange({ ...filters, maxAge: v })} placeholder="Max" />
            </div>
          </Field>

          <Field label="Max Distance (miles)">
            <NumberInput value={filters.maxDistance} onChange={v => onChange({ ...filters, maxDistance: v })} placeholder="e.g. 5" />
          </Field>

          <Field label="Gender">
            <SelectInput value={filters.gender} onChange={v => onChange({ ...filters, gender: v })} options={GENDER_OPTIONS} />
          </Field>

          <Field label="Sexuality">
            <SelectInput value={filters.sexuality} onChange={v => onChange({ ...filters, sexuality: v })} options={SEXUALITY_OPTIONS} />
          </Field>

          <Field label="Shower Frequency">
            <SelectInput value={filters.showerFrequency} onChange={v => onChange({ ...filters, showerFrequency: v })} options={SHOWER_OPTIONS} />
          </Field>

          <Field label="Looking For">
            <SelectInput value={filters.lookingFor} onChange={v => onChange({ ...filters, lookingFor: v })} options={LOOKING_FOR_OPTIONS} />
          </Field>
        </div>
      )}
    </>
  );
}

const SCENT_EMOJIS = { All: "✨", Fresh: "🧼", Musky: "🌲", Ripe: "🧀", Earthy: "🍂", Neutral: "⚖️" };

function ScentChips({ value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
      {SCENT_OPTIONS.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            display: "flex", alignItems: "center", gap: "3px",
            padding: "3px 8px", borderRadius: "9999px",
            fontSize: "11px", fontFamily: "var(--font-body)",
            cursor: "pointer",
            background: value === opt ? "rgba(124,58,237,0.85)" : "rgba(255,255,255,0.06)",
            color: value === opt ? "#fff" : "#94a3b8",
            border: value === opt ? "1px solid rgba(167,139,250,0.5)" : "1px solid rgba(255,255,255,0.1)",
            transition: "all 0.15s ease",
          }}
        >
          <span style={{ fontSize: "11px" }}>{SCENT_EMOJIS[opt]}</span>
          {opt}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <label style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "#64748b", display: "block", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      {children}
    </div>
  );
}

function NumberInput({ value, onChange, placeholder }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "8px", padding: "5px 10px", color: "#e2e8f0",
        fontFamily: "var(--font-body)", fontSize: "12px", outline: "none", width: "100%",
      }}
    />
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "8px", padding: "5px 10px", color: "#e2e8f0",
        fontFamily: "var(--font-body)", fontSize: "12px", outline: "none",
      }}
    >
      {options.map(o => <option key={o} value={o} style={{ background: "#1a1535" }}>{o}</option>)}
    </select>
  );
}