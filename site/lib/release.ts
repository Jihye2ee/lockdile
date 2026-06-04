const REPO = "Jihye2ee/lockdile";

export type ReleaseInfo = {
  version: string;
  publishedAt: string | null;
  dmgUrl: string | null;
  releasesUrl: string;
};

export async function getLatestRelease(): Promise<ReleaseInfo> {
  const releasesUrl = `https://github.com/${REPO}/releases`;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return { version: "", publishedAt: null, dmgUrl: null, releasesUrl };
    }
    const data = await res.json();
    const dmg = (data.assets ?? []).find((a: { name: string; browser_download_url: string }) =>
      a.name.endsWith(".dmg"),
    );
    return {
      version: (data.tag_name ?? "").replace(/^v/, ""),
      publishedAt: data.published_at ?? null,
      dmgUrl: dmg?.browser_download_url ?? null,
      releasesUrl,
    };
  } catch {
    return { version: "", publishedAt: null, dmgUrl: null, releasesUrl };
  }
}
