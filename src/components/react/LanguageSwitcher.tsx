import { useCallback } from 'react';
import type { Lang } from '../../types/paper';

interface Props {
  lang: Lang;
}

export default function LanguageSwitcher({ lang }: Props) {
  const toggle = useCallback(() => {
    const path = window.location.pathname;
    if (lang === 'zh') {
      window.location.href = path.replace(/^\/zh/, '/en');
    } else {
      window.location.href = path.replace(/^\/en/, '/zh');
    }
  }, [lang]);

  return (
    <button
      onClick={toggle}
      className="px-2.5 py-1 text-xs font-mono border border-white/20 rounded
                 text-text-secondary hover:text-neon-cyan hover:border-neon-cyan/50
                 transition-all duration-200"
      aria-label="Switch language"
    >
      {lang === 'zh' ? 'EN' : '中文'}
    </button>
  );
}
