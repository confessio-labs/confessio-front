import { revalidatePath } from "next/cache";
import { fetchDioceses } from "@/utils";
import { CITIES } from "@/cities";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dioceses = await fetchDioceses();

  for (const diocese of dioceses) {
    revalidatePath(`/diocese/${diocese.slug}`);
  }
  for (const city of CITIES) {
    revalidatePath(`/ville/${city.slug}`);
  }

  return Response.json({
    revalidated: { dioceses: dioceses.length, cities: CITIES.length },
  });
}
