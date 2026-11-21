import { useEffect, useState } from "react";
import { Activity, LayoutDashboard, Users, Ticket, PanelLeftClose, PanelLeftOpen, RefreshCw, LogOut, Settings } from "lucide-react";

import "./App.css";
import "./enterprise.css";
import "./flextrix.css";
import { Brand, BrandCredit, BrandEmblem, LanguageSwitch } from "./Brand";
import LoginPage from "./LoginPage";
import { refreshLocalData } from "./iam/data";
import { t, useLanguage, useLocalizedValidation } from "./i18n";
import { SettingsPage, type Theme } from "./iam/SettingsPage";
import { IamPage } from "./iam/IamPage";
import { getCurrentEmployee, type Employee } from "./services/api";

const navigation = [
  { label: "Home", icon: LayoutDashboard, tone: "blue" },
  { label: "Access", icon: Users, tone: "teal" },
  { label: "Tickets", icon: Ticket, tone: "violet" },
  { label: "Logs", icon: Activity, tone: "blue" },
] as const;

function getInitials(employee: Employee) {
  return `${employee.first_name.charAt(0)}${employee.last_name.charAt(0)}`.toUpperCase();
}

function App() {
  const language = useLanguage();
  useLocalizedValidation();
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem("identityops_token"),
  );
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [compact, setCompact] = useState(() => localStorage.getItem("identityops_nav_compact") === "true");
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem("flextrix_theme");
    return storedTheme === "dark" || storedTheme === "light" ? storedTheme : "system";
  });

  function changeTheme(next: Theme) {
    localStorage.setItem("flextrix_theme", next);
    setTheme(next);
  }

  const [activePage, setActivePage] = useState("Home");

  useEffect(() => {
    let cancelled = false;

    async function validateSession() {
      if (!token) {
        setCurrentEmployee(null);
        setAuthLoading(false);
        return;
      }

      setAuthLoading(true);

      try {
        const employee = await getCurrentEmployee(token);

        if (!cancelled) {
          setCurrentEmployee(employee);
        }
      } catch {
        sessionStorage.removeItem("identityops_token");

        if (!cancelled) {
          setToken(null);
          setCurrentEmployee(null);
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    void validateSession();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    localStorage.setItem("identityops_nav_compact", String(compact));
  }, [compact]);

  function handleLogin(accessToken: string) {
    sessionStorage.setItem("identityops_token", accessToken);
    setToken(accessToken);
  }

  function handleLogout() {
    sessionStorage.removeItem("identityops_token");
    setToken(null);
    setCurrentEmployee(null);
    setActivePage("Home");
  }

  if (authLoading) {
    return (
      <div className="auth-loading">
        <BrandEmblem />
        <p>{t("Verifying your session...")}</p>
      </div>
    );
  }

  if (!token || !currentEmployee) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const displayName = `${currentEmployee.first_name} ${currentEmployee.last_name}`;
  const initials = getInitials(currentEmployee);

  function navigate(page: string) {
    setActivePage(page);
  }

  return (
    <div className={`app-shell governance-shell directory-shell enterprise-shell flextrix-shell ${compact ? "compact-nav" : ""}`} data-theme={theme}>
      <aside className="sidebar">
        <Brand className="grans-sidebar" />
        <button type="button" className="icon-button sidebar-toggle" aria-expanded={!compact}
          title={t(compact ? "Expand sidebar" : "Collapse sidebar")} aria-label={t(compact ? "Expand sidebar" : "Collapse sidebar")}
          onClick={() => setCompact(value => !value)}>
          {compact ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </button>
        <nav className="sidebar-nav" aria-label={t("Main navigation")}>
          {navigation.map(({ label, icon: Icon, tone }) =>
            <button key={label} className={`nav-item flextrix-nav-${tone} ${activePage === label ? "active" : ""}`}
              aria-label={t(label)} title={t(label)} aria-current={activePage === label ? "page" : undefined}
              onClick={() => navigate(label)}>
              <Icon size={20} aria-hidden="true" /><span>{t(label)}</span>
            </button>
          )}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item" aria-label={t("Settings")} aria-current={activePage === "Settings" ? "page" : undefined} onClick={() => setActivePage("Settings")}>
            <Settings size={18} />
            <span>{t("Settings")}</span>
          </button>

          <div className="sidebar-divider" />

          <div className="user-profile">
            <div className="user-avatar">{initials}</div>
            <div className="user-copy">
              <span className="user-name">{displayName}</span>
              <span className="user-role">{currentEmployee.job_title}</span>
            </div>
            <button
              className="icon-button logout-button"
              aria-label={t("Log out")}
              title={t("Log out")}
              onClick={handleLogout}
            >
              <LogOut size={17} />
            </button>
          </div>
          <BrandCredit />
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <Brand className="grans-header" />
          <div className="breadcrumb">
            <span>Flextrix Access</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{t(activePage === "Access Certification" ? "Access Certification Campaigns" : activePage)}</strong>
          </div>

          <div className="topbar-actions">
            {activePage !== "Settings" && <button type="button" className="icon-button"
              title={t("Refresh local data")}
              aria-label={t("Refresh local data")}
              onClick={refreshLocalData}><RefreshCw size={17} aria-hidden="true" /></button>}
            <LanguageSwitch />
            <div className="topbar-avatar">{initials}</div>
          </div>
        </header>

        <div className="page-content">
          {activePage === "Settings" ? <SettingsPage token={token} employeeId={currentEmployee.id} theme={theme} onThemeChange={changeTheme} /> :
            <IamPage key={`${activePage}:${language}`} page={activePage} token={token}
              employeeId={currentEmployee.id} navigate={navigate} />}
        </div>
      </main>
    </div>
  );
}

export default App;
