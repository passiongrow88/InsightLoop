import React from 'react';
import { ViewType, Language, User } from '../types';
import { translations } from '../i18n';
import { Home, BookOpen, Sparkles, History, LogOut, Crown, Gift } from 'lucide-react';

interface LayoutProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  currentUser: User | null;
  onLogout: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({
  currentView,
  setCurrentView,
  language,
  setLanguage,
  currentUser,
  onLogout,
  children
}) => {
  const t = translations[language];

  // ✅ 不依赖 i18n 新增字段，避免你还要去改 translations
  const unlockLabel = language === 'zh' ? '解锁体验' : 'Unlock';
  const memberSpaceLabel = language === 'zh' ? '会员空间' : 'Member Space';

  const NavItem = ({ view, icon: Icon, label }: { view: ViewType; icon: any; label: string }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 font-medium whitespace-nowrap ${
        currentView === view
          ? 'bg-brand-500 text-white shadow-md'
          : 'text-stone-500 hover:text-brand-600 hover:bg-brand-50'
      } text-xs`}
    >
      <Icon size={16} />
      <span className="hidden sm:inline leading-none whitespace-nowrap">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans text-stone-700 bg-[#F8F7FF]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-brand-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Logo Section */}
            <div
              className="flex flex-col items-center md:items-start cursor-pointer"
              onClick={() => setCurrentView('home')}
            >
              <h1 className="font-serif text-3xl font-bold text-brand-600 tracking-wide flex items-baseline">
                InsightL<span className="text-red-500 font-normal relative top-[1px] mx-[1px] text-3xl">∞</span>p
              </h1>
              <span className="text-[10px] tracking-[0.2em] text-stone-400 font-sans uppercase">
                {t.subtitle}
              </span>
            </div>

            {/* Navigation & User Actions */}
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              <nav className="flex items-center gap-1 bg-white p-1 rounded-full border border-brand-100 shadow-sm overflow-x-auto max-w-full">
                <NavItem view="home" icon={Home} label={t.nav_home} />
                <NavItem view="journal" icon={BookOpen} label={t.nav_journal} />
                <NavItem view="manifestation" icon={Sparkles} label={t.nav_manifestation} />
                <NavItem view="history" icon={History} label={t.nav_history} />

                {/* ✅ 会员空间导航 */}
                <NavItem view="member-space" icon={Gift} label={memberSpaceLabel} />

                {/* ✅ 解锁体验（Billing） */}
                <NavItem view="billing" icon={Crown} label={unlockLabel} />
              </nav>

              <div className="flex items-center gap-3">
                <div className="flex bg-white rounded-lg border border-brand-100 p-1 shadow-sm">
                  <button
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      language === 'en' ? 'bg-brand-100 text-brand-700' : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setLanguage('zh')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      language === 'zh' ? 'bg-brand-100 text-brand-700' : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    中文
                  </button>
                </div>

                {currentUser && (
                  <div className="flex items-center gap-2 pl-2 border-l border-brand-100">
                    <span className="text-xs font-medium text-stone-500 hidden lg:block">
                      {currentUser.name}
                    </span>
                    <button
                      onClick={onLogout}
                      className="text-stone-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                      title={t.auth_logout}
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-stone-400 text-xs">
        <p className="font-serif italic">{t.footer_quote}</p>
        
        {/* ✅ 隐藏的管理员入口 - 点击 5 次可进入 */}
        <p 
          className="mt-4 cursor-default select-none"
          onClick={(e) => {
            // 使用 data attribute 计数点击
            const target = e.currentTarget;
            const clicks = parseInt(target.dataset.clicks || '0') + 1;
            target.dataset.clicks = clicks.toString();
            
            if (clicks >= 5) {
              setCurrentView('admin');
              target.dataset.clicks = '0';
            }
            
            // 3秒后重置计数
            setTimeout(() => {
              target.dataset.clicks = '0';
            }, 3000);
          }}
        >
          © 2026 InsightLoop
        </p>
      </footer>
    </div>
  );
};

export default Layout;
