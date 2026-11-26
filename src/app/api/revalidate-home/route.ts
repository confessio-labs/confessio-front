import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { checkCmsContent } from "@/lib/homeContent";

// Called by the CMS each time the home page content is saved.
export async function POST(request: Request) {
  const secret = process.env.CMS_WEBHOOK_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // revalidatePath drops the cached page outright, unlike the hourly
  // revalidation which keeps serving it until a new render succeeds. Only drop
  // it when the CMS can render a new one.
  try {
    await checkCmsContent();
  } catch (error) {
    console.error("Revalidating /home skipped:", error);
    return Response.json({ revalidated: false }, { status: 503 });
  }

  revalidatePath("/home");

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
