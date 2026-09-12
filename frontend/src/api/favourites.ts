// /v1/favourites (GET/POST/DELETE) is documented but doesn't exist on the
// live API - every call 404s (see findings: missing_endpoint). Saved
// listings are kept client-side instead, namespaced per logged-in user so
// they survive a reload and a re-login as required.

function keyFor(email: string): string {
  return `ivy_favourites:${email}`;
}

export function getFavouriteIds(email: string): string[] {
  try {
    const raw = localStorage.getItem(keyFor(email));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isFavourite(email: string, listingId: string): boolean {
  return getFavouriteIds(email).includes(listingId);
}

export function toggleFavourite(email: string, listingId: string): string[] {
  const ids = getFavouriteIds(email);
  const next = ids.includes(listingId) ? ids.filter((id) => id !== listingId) : [...ids, listingId];
  localStorage.setItem(keyFor(email), JSON.stringify(next));
  return next;
}
