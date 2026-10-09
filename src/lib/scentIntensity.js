export const SCENT_INTENSITIES = [
  { label: "Subtle", description: "Barely noticeable, even up close." },
  { label: "Light", description: "A gentle scent when someone gets close." },
  { label: "Noticeable", description: "Clearly present up close." },
  { label: "Strong", description: "Easy to notice without leaning in." },
  { label: "RANK", description: "A powerful scent that makes its presence known." },
];

export const INTENSITY_DEFINITION = "How noticeable your natural scent is right now.";
export const INTENSITY_HELP = "Rate your scent today—it can change with activity, clothing, and washing.";

export function scentIntensity(value) {
  const rating = Number(value);
  return Number.isInteger(rating) && rating >= 1 && rating <= 5
    ? SCENT_INTENSITIES[rating - 1]
    : { label: "Not set", description: "Scent intensity has not been set." };
}
