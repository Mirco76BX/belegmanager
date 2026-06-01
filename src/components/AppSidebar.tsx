import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";
import { LayoutDashboard, Receipt, Building2, FileSpreadsheet, LogOut, FileText, Shield, Menu, X, ScanLine, Upload, CreditCard, UserCircle, Users, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import InviteDialog from "@/components/InviteDialog";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import { useState } from "react";
import { VERSION_LABEL } from "@/lib/version";

const AppSidebar = () => {
  const { signOut, subscription } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  const isTaxAdvisor = subscription.tier === "tax_advisor";

  // Desktop-Sidebar: alle Items vertikal (kein Platzproblem)
  const navItems = [
    { key: "nav.dashboard" as const, icon: LayoutDashboard, path: "/" },
    { key: "nav.receipts" as const, icon: Receipt, path: "/receipts" },
    { key: "nav.companies" as const, icon: Building2, path: "/companies" },
    { key: "nav.expenseReport" as const, icon: FileSpreadsheet, path: "/expense-report" },
    { key: "nav.fahrtkosten" as const, icon: Car, path: "/fahrtkosten" },
    ...(isTaxAdvisor ? [{ key: "nav.clients" as const, icon: Users, path: "/clients" }] : []),
  ];

  // Mobile-Bottom-Nav: EXAKT 4 Items + Scan-Button in der Mitte = 5 Spalten.
  // Fahrtkosten landet immer im Hamburger-Menü (weniger frequent als die anderen).
  // Bei Steuerberatern: Mandanten ersetzt Orga im Bottom-Nav (Mandanten = Daily-Driver).
  const bottomNavItems = isTaxAdvisor
    ? [
        { key: "nav.dashboard" as const, icon: LayoutDashboard, path: "/" },
        { key: "nav.receipts" as const, icon: Receipt, path: "/receipts" },
        // [Scan-Button hier]
        { key: "nav.clients" as const, icon: Users, path: "/clients" },
        { key: "nav.expenseReport" as const, icon: FileSpreadsheet, path: "/expense-report" },
      ]
    : [
        { key: "nav.dashboard" as const, icon: LayoutDashboard, path: "/" },
        { key: "nav.receipts" as const, icon: Receipt, path: "/receipts" },
        // [Scan-Button hier]
        { key: "nav.companies" as const, icon: Building2, path: "/companies" },
        { key: "nav.expenseReport" as const, icon: FileSpreadsheet, path: "/expense-report" },
      ];

  // Items, die NICHT im Bottom-Nav sind, müssen im Hamburger erreichbar sein
  const hiddenNavItems = isTaxAdvisor
    ? [
        { key: "nav.companies" as const, icon: Building2, path: "/companies" },
        { key: "nav.fahrtkosten" as const, icon: Car, path: "/fahrtkosten" },
      ]
    : [
        { key: "nav.fahrtkosten" as const, icon: Car, path: "/fahrtkosten" },
      ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
        <button onClick={() => navigate("/")} className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5 w-full text-left hover:bg-sidebar-accent/30 transition-colors">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <FileText className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-sidebar-foreground">{t("app.name")}</h2>
            <p className="text-xs text-sidebar-foreground/60">{t("app.tagline")}</p>
          </div>
        </button>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {t(item.key)}
              </button>
            );
          })}
        </nav>

        {location.pathname !== "/admin/users" && (
          <div className="px-3 pb-2">
            <Button
              className="w-full gap-2"
              onClick={() => {
                navigate("/receipts");
                setTimeout(() => window.dispatchEvent(new CustomEvent("open-scan")), 100);
              }}
            >
              <Upload className="h-4 w-4" />
              {lang === "de" ? "Beleg hochladen" : "Upload Receipt"}
            </Button>
          </div>
        )}

        <div className="border-t border-sidebar-border px-3 py-3 space-y-1">
          {isAdmin && (
            <button
              onClick={() => navigate("/admin/users")}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                location.pathname === "/admin/users"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <Shield className="h-4 w-4" />
              {lang === "de" ? "Benutzerverwaltung" : "User Management"}
            </button>
          )}
          <button
            onClick={() => navigate("/account")}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
              location.pathname === "/account"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            }`}
          >
            <UserCircle className="h-4 w-4" />
            {lang === "de" ? "Mein Konto" : "My Account"}
          </button>
          <InviteDialog />
          <LanguageSwitcher showLabel className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground" />
          <ThemeToggle showLabel className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
            {t("auth.logout")}
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-sidebar px-4 py-3 safe-area-top">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <FileText className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground">{t("app.name")}</span>
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-sidebar-foreground"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed left-0 right-0 z-40 bg-sidebar border-b border-sidebar-border px-4 py-3 space-y-1 animate-fade-in max-h-[calc(100vh-7rem)] overflow-y-auto" style={{ top: 'calc(env(safe-area-inset-top) + 52px)' }}>
          {/* Navigation-Items, die nicht in der Bottom-Nav sind */}
          {hiddenNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {t(item.key)}
              </button>
            );
          })}
          {hiddenNavItems.length > 0 && (
            <div className="border-t border-sidebar-border my-1" />
          )}
          {isAdmin && (
            <button
              onClick={() => { navigate("/admin/users"); setMobileMenuOpen(false); }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
            >
              <Shield className="h-4 w-4" />
              {lang === "de" ? "Benutzerverwaltung" : "User Management"}
            </button>
          )}
          <button
            onClick={() => { navigate("/account"); setMobileMenuOpen(false); }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
          >
            <UserCircle className="h-4 w-4" />
            {lang === "de" ? "Mein Konto" : "My Account"}
          </button>
          <InviteDialog />
          <LanguageSwitcher showLabel onSelect={() => setMobileMenuOpen(false)} className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground" />
          <ThemeToggle showLabel onSelect={() => setMobileMenuOpen(false)} className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { signOut(); setMobileMenuOpen(false); }}
            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
            {t("auth.logout")}
          </Button>
          <Link
            to="/impressum"
            state={{ from: location.pathname }}
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground"
          >
            Impressum
          </Link>
          {/* Version-Anzeige am Ende */}
          <div className="border-t border-sidebar-border mt-1 pt-2 px-3">
            <p className="text-[10px] text-sidebar-foreground/40 font-mono">{VERSION_LABEL}</p>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation — exakt 4 Items + Scan-Button in der Mitte = 5 Spalten */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border safe-area-bottom">
        <div className="grid grid-cols-5 items-end py-2">
          {/* Erste zwei Items links */}
          {bottomNavItems.slice(0, 2).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 py-1 transition-colors ${
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{t(item.key)}</span>
              </button>
            );
          })}

          {/* Scan-Button mittig */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                navigate("/receipts");
                setTimeout(() => window.dispatchEvent(new CustomEvent("open-scan")), 100);
              }}
              className="flex items-center justify-center -mt-10 h-[4.5rem] w-[4.5rem] rounded-full bg-primary text-primary-foreground shadow-2xl active:scale-95 transition-transform ring-4 ring-sidebar"
            >
              <ScanLine className="h-8 w-8" />
            </button>
          </div>

          {/* Letzte zwei Items rechts */}
          {bottomNavItems.slice(2).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 py-1 transition-colors ${
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{t(item.key)}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default AppSidebar;
