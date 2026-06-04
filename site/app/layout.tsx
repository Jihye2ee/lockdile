import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "와악어 (Lockdile) — 자리 비우면 악어가 지킨다 🐊",
  description:
    "자리 비울 때 남이 키보드를 누르면 악어가 커서를 물고 화면을 잠그는 macOS 메뉴바 앱. 무료 · 오픈소스.",
  openGraph: {
    title: "와악어 (Lockdile) 🐊",
    description: "자리 비우면 악어가 키보드 침입자를 물고 화면을 잠급니다.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="nav">
          <Link href="/" className="brand">
            🐊 와악어
          </Link>
          <nav className="nav-links">
            <Link href="/download">Download</Link>
            <a href="https://github.com/Jihye2ee/lockdile" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>
        </header>
        {children}
        <footer className="footer">
          <span>© 2026 Lockdile · MIT</span>
          <a href="https://github.com/Jihye2ee/lockdile" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </footer>
      </body>
    </html>
  );
}
