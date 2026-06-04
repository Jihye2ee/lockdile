import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/i18n/dictionaries";
import { locales, type Locale } from "@/i18n/config";
import "../globals.css";

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const metadata: Metadata = {
  title: "와악어 (Lockdile) 🐊",
  description:
    "A menu-bar crocodile that guards your unlocked Mac. Free & open source.",
};

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);

  return (
    <html lang={lang}>
      <body>
        <header className="nav">
          <Link href={`/${lang}`} className="brand">
            🐊 {dict.hero.title}
          </Link>
          <nav className="nav-links">
            <Link href={`/${lang}/download`}>{dict.nav.download}</Link>
            <a href="https://github.com/Jihye2ee/lockdile" target="_blank" rel="noreferrer">
              {dict.nav.github}
            </a>
          </nav>
        </header>
        {children}
        <footer className="footer">
          <span>{dict.footer}</span>
          <a href="https://github.com/Jihye2ee/lockdile" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </footer>
      </body>
    </html>
  );
}
