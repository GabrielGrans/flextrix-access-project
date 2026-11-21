import { useId } from "react";
import "./brand.css";
import { setLanguage, t, useLanguage } from "./i18n";

export function BrandEmblem() {
  const cutout = useId();
  return <svg className="grans-emblem flextrix-emblem" viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <mask id={cutout}>
        <path d="M0 0h48v48H0z" fill="white" />
        <path d="M19 20l5-5 5 5-5 5z" fill="black" />
      </mask>
    </defs>
    <g mask={`url(#${cutout})`} fill="currentColor">
      <path d="M7 8h10l24 28v4H31L7 12z" />
      <path d="M41 8H31L7 36v4h10l24-28z" />
    </g>
  </svg>;
}

export function Brand({ className }: { className: string }) {
  return (
    <div className={`grans-brand ${className}`}>
      <BrandEmblem />
      <div className="flextrix-lockup"><strong>FLEXTRIX</strong><span>IDENTITY &amp; ACCESS</span></div>
    </div>
  );
}

export function BrandCredit() {
  return <p className="grans-credit">Desenvolvido por Gabriel Grans</p>;
}

export function LanguageSwitch() {
  const language = useLanguage();
  return <div className="flextrix-language" role="group" aria-label={t("Language")}>
    <button type="button" aria-pressed={language === "pt-BR"} onClick={() => setLanguage("pt-BR")}>PT-BR</button>
    <button type="button" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
  </div>;
}
