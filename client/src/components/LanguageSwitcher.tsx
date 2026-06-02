import { useLanguage } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex rounded-2xl border border-white/10 bg-[#12161d]/90 p-1 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <button
        type="button"
        onClick={() => setLanguage("ru")}
        className={`rounded-xl px-3 py-1.5 text-xs font-semibold tracking-[0.14em] transition ${
          language === "ru" ? "bg-[#f3b35a] text-[#111317]" : "text-white/70 hover:bg-white/5"
        }`}
        data-testid="button-language-ru"
      >
        RU
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`rounded-xl px-3 py-1.5 text-xs font-semibold tracking-[0.14em] transition ${
          language === "en" ? "bg-[#f3b35a] text-[#111317]" : "text-white/70 hover:bg-white/5"
        }`}
        data-testid="button-language-en"
      >
        EN
      </button>
    </div>
  );
}
