import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { fetchDioceses } from "@/utils";
import { CITIES } from "@/cities";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dioceses = await fetchDioceses();
  const paths = [
    ...dioceses.map((diocese) => `/diocese/${diocese.slug}`),
    ...CITIES.map((city) => `/ville/${city.slug}`),
  ];

  for (const path of paths) {
    revalidatePath(path);
  }

  // Invalidated pages are only rebuilt on their next visit, which may come
  // late in the day, when the API no longer returns the day's past events.
  // Visit them now so they're rebuilt with the full day. This must run in
  // `after`: Next applies the revalidatePath calls once the handler returns.
  const origin = new URL(request.url).origin;
  after(async () => {
    for (const path of paths) {
      try {
        const response = await fetch(`${origin}${path}`, { cache: "no-store" });
        if (!response.ok) {
          console.error(`Rebuilding ${path} failed: HTTP ${response.status}`);
        }
      } catch (error) {
        console.error(`Rebuilding ${path} failed:`, error);
      }
    }
  });

  return Response.json({
    revalidated: { dioceses: dioceses.length, cities: CITIES.length },
  });
}
