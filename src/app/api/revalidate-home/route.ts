import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { HOME_CONTENT_TAG } from "@/lib/homeContent";

// Called by the CMS each time the home page content is saved.
export async function POST(request: Request) {
  const secret = process.env.CMS_WEBHOOK_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag(HOME_CONTENT_TAG, "max");

  // The first visit after a revalidation still gets the stale page while the
  // new one renders, so make that first visit ourselves.
  const origin = new URL(request.url).origin;
  after(async () => {
    try {
      await fetch(`${origin}/home`, { cache: "no-store" });
    } catch (error) {
      console.error("Rebuilding /home failed:", error);
    }
  });

  return Response.json({ revalidated: true });
}
