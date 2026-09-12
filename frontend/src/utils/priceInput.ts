// Lets the price filter fields accept Indian real-estate shorthand
// ("50L", "1.2cr") instead of forcing raw rupees - the API's min_price/
// max_price params only accept plain rupee integers, so whatever the user
// types here has to be converted before it goes into the query.
export function parsePriceShorthand(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(cr|crore|crores|l|lac|lacs|lakh|lakhs)?$/i);
  if (!match) return undefined;

  const value = parseFloat(match[1]);
  if (Number.isNaN(value)) return undefined;

  const unit = match[2]?.toLowerCase();
  if (unit?.startsWith("cr")) return Math.round(value * 10000000);
  if (unit?.startsWith("l")) return Math.round(value * 100000);
  return Math.round(value);
}

export function formatResolvedPrice(rupees: number): string {
  return `₹${rupees.toLocaleString("en-IN")}`;
}
