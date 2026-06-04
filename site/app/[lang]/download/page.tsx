import { getLatestRelease } from "@/lib/release";
import { getDictionary } from "@/i18n/dictionaries";
import { dateLocale, type Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default async function Download({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);
  const { version, publishedAt, releasesUrl } = await getLatestRelease();

  const released =
    publishedAt &&
    new Date(publishedAt).toLocaleDateString(dateLocale[lang as Locale], {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <main className="download">
      <h1>{dict.download.title}</h1>
      <p className="subtagline">{dict.download.subtitle}</p>
      {version && (
        <p className="version">
          {dict.download.versionLabel} {version}
          {released && ` · ${dict.download.releasedLabel} ${released}`}
        </p>
      )}

      <div className="platform-card">
        <div className="platform-emoji">🍎</div>
        <h2>macOS</h2>
        <p className="req">{dict.download.req}</p>
        <a href="/download/mac" className="btn btn-primary">
          {dict.download.button}
        </a>
      </div>

      <div className="firstrun">
        <h3>{dict.download.firstrunTitle}</h3>
        <ol>
          {dict.download.firstrun.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </div>

      <a className="all-releases" href={releasesUrl} target="_blank" rel="noreferrer">
        {dict.download.allReleases}
      </a>
    </main>
  );
}
