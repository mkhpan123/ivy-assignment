import type { Rental } from "../api/types";

// `deposit` is documented as "the security deposit in rupees", but ~20% of
// rentals (384/1900) instead store a bare 2-10 multiplier - the number of
// months' rent the deposit represents, never multiplied out. Confirmed:
// the deposit/price ratio for the other 1516 records has exactly the same
// distribution (min 2, p25 4, median 6, p75 8, max 10) as the raw "deposit"
// values in this group, so it's not noise - it's the same field with the
// rupee conversion missing. See findings: units.
export function trueDeposit(r: Rental): number {
  return r.deposit < 1000 ? r.deposit * r.price : r.deposit;
}
