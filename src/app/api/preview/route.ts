import { cookies, draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { PREVIEW_VERSION_COOKIE } from "@/lib/homeContent";

const PUBLISHED_VERSIONS = ["", "main", "published"];

// Opened by the CMS's live preview: shows the home page with the version
// being edited instead of the cached, published one.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const secret = process.env.CMS_PREVIEW_SECRET;
  if (!secret || params.get("secret") !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  (await draftMode()).enable();

  const version = params.get("version") ?? "";
  const jar = await cookies();
  if (PUBLISHED_VERSIONS.includes(version)) {
    jar.delete(PREVIEW_VERSION_COOKIE);
  } else {
    jar.set(PREVIEW_VERSION_COOKIE, version, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
  }

  redirect("/home");
}
