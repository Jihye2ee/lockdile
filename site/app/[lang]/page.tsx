import Link from "next/link";
import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);

  return (
    <main>
      <section className="hero">
        <div className="croc" aria-hidden>
          🐊
        </div>
        <h1>
          {dict.hero.title} <span className="dim">{dict.hero.subtitle}</span>
        </h1>
        <p className="tagline">{dict.hero.tagline}</p>
        <p className="subtagline">{dict.hero.subtagline}</p>
        <div className="cta">
          <Link href={`/${lang}/download`} className="btn btn-primary">
            {dict.hero.download}
          </Link>
          <a
            href="https://github.com/Jihye2ee/lockdile"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
          >
            {dict.hero.github}
          </a>
        </div>
      </section>

      <section className="steps">
        {dict.steps.map((step) => (
          <div className="step" key={step.title}>
            <div className="step-emoji">{step.emoji}</div>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
