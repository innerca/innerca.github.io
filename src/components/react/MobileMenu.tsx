import { useState } from 'react';
import type { Lang } from '../../types/paper';
import { siteConfig } from '../../config/site';

interface Props {
  lang: Lang;
  currentPath?: string;
}

export default function MobileMenu({ lang, currentPath = '' }: Props) {
  const [open, setOpen] = useState(false);
  const navLinks = siteConfig.nav[lang];
  const otherLang: Lang = lang === 'zh' ? 'en' : 'zh';

  const switchHref = (path: string) =>
    lang === 'zh'
      ? path.replace(/^\/zh/, '/en')
      : path.replace(/^\/en/, '/zh');

  return (
    <>
      {/* Hamburger trigger */}
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-text-secondary hover:text-neon-cyan transition-colors"
        aria-label="Menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay + drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute right-0 top-0 h-full w-72 max-w-[80vw] bg-[rgba(11,15,25,0.98)] border-l border-white/10 shadow-2xl">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between px-5 h-16 border-b border-white/5">
                <span className="text-sm text-text-secondary font-mono">
                  {lang === 'zh' ? '导航' : 'Menu'}
                </span>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 text-text-secondary hover:text-accent-red transition-colors"
                  aria-label="Close menu"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Nav links */}
              <nav className="flex-1 px-3 py-4 space-y-1">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-3 rounded-lg text-sm font-mono transition-all
                      ${currentPath === link.href
                        ? 'text-neon-cyan bg-neon-cyan/5 border border-neon-cyan/20'
                        : 'text-text-secondary hover:text-neon-cyan hover:bg-white/5'
                      }`}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>

              {/* Language switch */}
              <div className="px-5 py-4 border-t border-white/5">
                <a
                  href={switchHref(currentPath || `/${lang}`)}
                  onClick={() => setOpen(false)}
                  className="block w-full px-4 py-2.5 text-center text-sm font-mono
                             border border-white/20 rounded-lg text-text-secondary
                             hover:text-neon-cyan hover:border-neon-cyan/50 transition-all"
                >
                  {lang === 'zh' ? 'English' : '中文'}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
