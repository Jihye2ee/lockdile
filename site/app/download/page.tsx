import { getLatestRelease } from "@/lib/release";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function Download() {
  const { version, publishedAt, releasesUrl } = await getLatestRelease();

  return (
    <main className="download">
      <h1>Download 와악어</h1>
      <p className="subtagline">Available for macOS (Apple Silicon). Free &amp; open source.</p>
      {version && (
        <p className="version">
          Version {version}
          {publishedAt && ` · Released ${formatDate(publishedAt)}`}
        </p>
      )}

      <div className="platform-card">
        <div className="platform-emoji">🍎</div>
        <h2>macOS</h2>
        <p className="req">macOS 11 or later · Apple Silicon</p>
        <a href="/download/mac" className="btn btn-primary">
          ↓ Download .dmg
        </a>
      </div>

      <div className="firstrun">
        <h3>처음 실행할 때</h3>
        <ol>
          <li>
            받은 <code>.dmg</code>를 열고 앱을 <code>Applications</code>로 드래그
          </li>
          <li>
            앱 우클릭 → <b>열기</b> → <b>열기</b> (공증 전이라 Gatekeeper 경고가 떠요)
          </li>
          <li>
            시스템 설정 → 개인정보 보호 및 보안 → <b>손쉬운 사용</b> + <b>입력 모니터링</b>에서
            lockdile 허용 후 재실행
          </li>
        </ol>
      </div>

      <a className="all-releases" href={releasesUrl} target="_blank" rel="noreferrer">
        View all releases on GitHub →
      </a>
    </main>
  );
}
