import Link from "next/link";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="croc" aria-hidden>
          🐊
        </div>
        <h1>
          와악어 <span className="dim">Lockdile</span>
        </h1>
        <p className="tagline">
          자리 비울 때 남이 키보드를 누르면, 악어가 커서를 물고 화면을 잠급니다.
        </p>
        <p className="subtagline">
          A menu-bar crocodile that guards your unlocked Mac. Free &amp; open source.
        </p>
        <div className="cta">
          <Link href="/download" className="btn btn-primary">
            ↓ Download for macOS
          </Link>
          <a
            href="https://github.com/Jihye2ee/lockdile"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
          >
            View on GitHub
          </a>
        </div>
      </section>

      <section className="steps">
        <div className="step">
          <div className="step-emoji">🛡️</div>
          <h3>가드 ON</h3>
          <p>자리 뜰 때 메뉴바 🐊 또는 ⌃⌥G로 경비 모드를 켭니다.</p>
        </div>
        <div className="step">
          <div className="step-emoji">⌨️</div>
          <h3>침입 감지</h3>
          <p>누군가 키보드를 누르면 그 순간을 포착합니다. (마우스는 무시)</p>
        </div>
        <div className="step">
          <div className="step-emoji">🔒</div>
          <h3>와앙 + 잠금</h3>
          <p>악어가 커서로 달려들어 물고, 화면을 잠가버립니다.</p>
        </div>
      </section>
    </main>
  );
}
