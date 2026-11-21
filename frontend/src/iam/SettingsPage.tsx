import { setLanguage, t, useLanguage } from "../i18n";
import EmployeesPage from "../EmployeesPage";
import { useQuery } from "./data";
import { Page, Panel, QueryState } from "./common";

export type Theme = "light" | "dark" | "system";

export function SettingsPage({ token, employeeId, theme, onThemeChange }: {
  token: string;
  employeeId: number;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}) {
  const language = useLanguage();
  const permissions = useQuery<string[]>(token, "/auth/me/permissions");

  return <Page title={t("Settings")}>
    <div className="flextrix-settings">
      <Panel title={t("Preferences")}>
        <div className="flextrix-preferences">
          <label>{t("Language")}
            <select value={language} onChange={event => setLanguage(event.target.value === "pt-BR" ? "pt-BR" : "en")}>
              <option value="en">English</option>
              <option value="pt-BR">Português (Brasil)</option>
            </select>
          </label>
          <label>{t("Appearance")}
            <select value={theme} onChange={event => onThemeChange(event.target.value as Theme)}>
              <option value="system">{t("Use system theme")}</option>
              <option value="light">{t("Light")}</option>
              <option value="dark">{t("Dark")}</option>
            </select>
          </label>
        </div>
        <p>{t("These preferences are saved on this device.")}</p>
      </Panel>
      <QueryState result={permissions}>{grants => grants.includes("employees:read") &&
        <Panel title={t("Platform users")}>
          <p>{t("Manage who can sign in to Flextrix and the access they have.")}</p>
          <EmployeesPage token={token} employeeId={employeeId} embedded />
        </Panel>}
      </QueryState>
    </div>
  </Page>;
}
