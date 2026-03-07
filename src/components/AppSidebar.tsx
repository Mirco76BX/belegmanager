import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";
import { LayoutDashboard, Receipt, Building2, FileSpreadsheet, LogOut, Globe, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import InviteDialog from "@/components/InviteDialog";

const AppSidebar = () => {
  const { signOut } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { key: "nav.dashboard" as const, icon: LayoutDashboard, path: "/" },
    { key: "nav.receipts" as const, icon: Receipt, path: "/receipts" },
    { key: "nav.companies" as const, icon: Building2, path: "/companies" },
    { key: "nav.expenseReport" as const, icon: FileSpreadsheet, path: "/expense-report" },
  ];

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <FileText className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-sidebar-foreground">{t("app.name")}</h2>
          <p className="text-xs text-sidebar-foreground/60">{t("app.tagline")}</p>
        </div>
      </div>

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
        <InviteDialog />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLang(lang === "de" ? "en" : "de")}
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <Globe className="h-4 w-4" />
          {lang === "de" ? "English" : "Deutsch"}
        </Button>
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
  );
};

export default AppSidebar;
