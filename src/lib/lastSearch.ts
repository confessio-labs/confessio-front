// Kept on the device only: it lets the home page offer "Reprendre : <lieu>"
// and is never sent anywhere.
const STORAGE_KEY = "confessio:last-search";

export type LastSearch = { label: string; href: string };

export const saveLastSearch = (search: LastSearch) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(search));
  } catch {}
};

export const readLastSearchRaw = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const parseLastSearch = (raw: string | null): LastSearch | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (
      typeof value?.label === "string" &&
      typeof value?.href === "string" &&
      value.href.startsWith("/")
    ) {
      return { label: value.label, href: value.href };
    }
  } catch {}
  return null;
};

export const subscribeToLastSearch = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};
