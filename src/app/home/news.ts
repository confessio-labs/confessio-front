export type MonthlyNews = { title: string; href: string };

// The band under the hero is hidden while this is null, so a stale item never
// lingers on the page.
export const MONTHLY_NEWS: MonthlyNews | null = null;
