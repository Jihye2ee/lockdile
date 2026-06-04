import { getLatestRelease } from "@/lib/release";

export const dynamic = "force-dynamic";

export async function GET() {
  const { dmgUrl, releasesUrl } = await getLatestRelease();
  return Response.redirect(dmgUrl ?? releasesUrl, 302);
}
