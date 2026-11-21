import { useState } from "react";
import { Activity, ChevronRight, KeyRound, Search, ShieldCheck, Ticket, Users, UsersRound } from "lucide-react";
import { t } from "../i18n";
import { EntraUserPreview } from "./EntraUserPreview";
import { AuditPage } from "./WorkflowPages";
import { ServiceNowPage } from "./EntraChangeRequests";
import { DirectoryDetails } from "./UnifiedEntraDirectory";
import { DataTable, Drawer, QueryState, StatusBadge } from "./common";
import { displayTime, useQuery, type Session } from "./data";

type Person = { object_id: string; display_name: string | null; email: string | null; account_enabled: boolean | null };
type Group = { object_id: string; display_name: string | null; membership_count: number };
type DirectoryList<T> = { items: T[]; next_after: number | null };
type Simulation = {
  sys_id: string;
  ritm: string;
  created_at: string;
  evidence: { user_object_id: string; group_object_id: string; operation: "grant" | "revoke" };
};
const directory = "/entra/directory";
const simulations = "/integrations/servicenow/access-requests/snapshot";

function Banner({ title, description }: { title: string; description: string }) {
  return <header className="flextrix-banner"><h1>{t(title)}</h1><p>{t(description)}</p></header>;
}

function SimulationLog({ session, person, groupNames }: {
  session: Session; person?: Person; groupNames?: Map<string, string>;
}) {
  const [cursor, setCursor] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const before = cursor.at(-1);
  const canRead = session.permissions.includes("entra:approve_change");
  const canReadEntra = session.permissions.includes("entra:read");
  const entries = useQuery<Simulation[]>(session.token, canRead ? simulations + (before ? `?before=${before}` : "") : null);
  const names = useQuery<DirectoryList<Person>>(session.token, !person && canRead && canReadEntra ? `${directory}/users?limit=100` : null);
  const groups = useQuery<DirectoryList<Group>>(session.token, !groupNames && canRead && canReadEntra ? `${directory}/groups?limit=100` : null);
  const userName = (id: string) => person?.object_id === id ? person.display_name ?? person.email ?? id :
    names.data?.items.find(user => user.object_id === id)?.display_name ?? id;
  const groupName = (id: string) => groupNames?.get(id) ?? groups.data?.items.find(group => group.object_id === id)?.display_name ?? id;
  const action = (op: Simulation["evidence"]["operation"]) => t(op === "grant" ? "Add membership" : "Remove membership");
  if (!canRead) return null;
  return <section className="flextrix-card flextrix-log">
    <h2>{t(person ? "Recent activity" : "ServiceNow activity")}</h2>
    {!person && <label className="flextrix-search"><Search size={19} aria-hidden="true" />
      <input type="search" aria-label={t("Search activity")} placeholder={t("Search activity")} value={filter} onChange={event => setFilter(event.target.value)} />
    </label>}
    <QueryState result={entries}>{rows => {
      const term = filter.trim().toLocaleLowerCase();
      const visible = rows.filter(row => person ? row.evidence.user_object_id === person.object_id :
        [row.ritm, userName(row.evidence.user_object_id), groupName(row.evidence.group_object_id), action(row.evidence.operation), t("Simulated")]
          .some(value => value.toLocaleLowerCase().includes(term)));
      return <>
        <DataTable label={t("ServiceNow activity")} rows={visible} rowKey={row => row.sys_id} columns={[
          { label: t("User"), render: row => userName(row.evidence.user_object_id) },
          { label: t("Action"), render: row => `${action(row.evidence.operation)} · ${groupName(row.evidence.group_object_id)}` },
          { label: t("Source"), render: () => "ServiceNow" },
          { label: t("Ticket"), render: row => row.ritm },
          { label: t("Status"), render: () => <StatusBadge>{t("Simulated")}</StatusBadge> },
          { label: t("Date"), render: row => displayTime(row.created_at) },
        ]} />
        {(before || rows.length === 25) && <div className="iam-actions">
          <button className="secondary-button" disabled={!before} onClick={() => setCursor(cursor.slice(0, -1))}>{t("Previous page")}</button>
          <button className="secondary-button" disabled={rows.length < 25} onClick={() => setCursor([...cursor, rows[24].sys_id])}>{t("Next page")}</button>
        </div>}
      </>;
    }}</QueryState>
  </section>;
}

function AccessWorkspace({ session }: { session: Session }) {
  const [kind, setKind] = useState<"users" | "groups">("users");
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<number[]>([]);
  const [selected, setSelected] = useState<string>();
  const [details, setDetails] = useState<{ kind: "users" | "groups"; id: string }>();
  const [demo, setDemo] = useState<string>();
  const [revision, setRevision] = useState(0);
  const params = new URLSearchParams({ query: query.trim(), limit: "25" });
  const after = cursor.at(-1);
  if (after !== undefined) params.set("after", String(after));
  const people = useQuery<DirectoryList<Person>>(session.token, kind === "users" ? `${directory}/users?${params}` : null, revision);
  const groups = useQuery<DirectoryList<Group>>(session.token, kind === "groups" ? `${directory}/groups?${params}` : null, revision);
  const person = people.data?.items.find(user => user.object_id === selected) ?? people.data?.items[0];
  const memberships = useQuery<DirectoryList<Group>>(session.token, kind === "users" && person
    ? `${directory}/users/${person.object_id}/groups?limit=25` : null, revision);
  const groupNames = useQuery<DirectoryList<Group>>(session.token, kind === "users" ? `${directory}/groups?limit=100` : null, revision);
  const label = t(kind === "users" ? "Search by name or email" : "Search groups");
  const page = (next: number | null) => (after !== undefined || next !== null) && <div className="iam-actions">
    <button className="secondary-button" disabled={after === undefined} onClick={() => setCursor(cursor.slice(0, -1))}>{t("Previous page")}</button>
    <button className="secondary-button" disabled={next === null} onClick={() => next !== null && setCursor([...cursor, next])}>{t("Next page")}</button>
  </div>;
  const targets = kind === "users" ? people.data : groups.data;
  return <div className="flextrix-workspace">
    <Banner title="Access" description="Manage Microsoft Entra ID users and groups." />
    <div className="flextrix-section-heading">
    <div className="flextrix-tabs" role="group" aria-label={t("Access")}>
      {(["users", "groups"] as const).map(value => <button type="button" key={value} aria-pressed={kind === value}
        onClick={() => { setKind(value); setQuery(""); setSelected(undefined); setCursor([]); }}>{t(value === "users" ? "Users" : "Groups")}</button>)}
    </div>
      {kind === "users" && <button type="button" className="secondary-button" onClick={() => setDemo("Create Entra ID user")}>
        {t("Create Entra ID user")} · {t("Demonstration")}
      </button>}
    </div>
    <label className="flextrix-search"><Search size={20} aria-hidden="true" />
      <input type="search" aria-label={label} placeholder={label} maxLength={150} value={query}
        onChange={event => { setQuery(event.target.value); setSelected(undefined); setCursor([]); }} />
    </label>
    {kind === "users" ? <QueryState result={people}>{result => person ? <>
      {result.items.length > 1 && <label className="flextrix-selection">{t("User")}
        <select value={person.object_id} onChange={event => setSelected(event.target.value)}>
          {result.items.map(user => <option key={user.object_id} value={user.object_id}>{user.display_name ?? user.email ?? user.object_id}</option>)}
        </select></label>}
      <div className="flextrix-access-grid">
        <section className="flextrix-card">
          <div className="flextrix-profile">
            <div className="flextrix-profile-avatar" aria-hidden="true">{(person.display_name ?? person.email ?? "?").split(" ").slice(0, 2).map(word => word[0]).join("").toUpperCase()}</div>
            <div><h2>{person.display_name ?? person.email ?? person.object_id}</h2>{person.email && <p>{person.email}</p>}</div>
            <span className="flextrix-pill">{t(person.account_enabled === true ? "Active" : person.account_enabled === false ? "Inactive" : "Account status unavailable")}</span>
          </div>
          <h3>{t("Current groups")}</h3>
          <QueryState result={memberships}>{membership => membership.items.length ? <ul className="flextrix-memberships">
            {membership.items.map(group => <li key={group.object_id}><UsersRound size={17} aria-hidden="true" />{group.display_name ?? group.object_id}</li>)}
          </ul> : <p>{t("No records.")}</p>}</QueryState>
        </section>
        <section className="flextrix-card">
          <h2>{t("Access actions")}</h2>
          <div className="flextrix-actions">
            <button onClick={() => setDetails({ kind: "users", id: person.object_id })}>
              <span className="flextrix-action-icon teal"><UsersRound aria-hidden="true" /></span><strong>{t("Manage groups")}</strong><ChevronRight aria-hidden="true" />
            </button>
            {[{ label: "Reset password", icon: KeyRound, tone: "amber" }, { label: "Re-register MFA", icon: ShieldCheck, tone: "violet" }].map(({ label: name, icon: Icon, tone }) =>
              <button key={name} onClick={() => setDemo(name)}>
                <span className={`flextrix-action-icon ${tone}`}><Icon aria-hidden="true" /></span>
                <span><strong>{t(name)}</strong><small>{t("Demonstration")}</small></span><ChevronRight aria-hidden="true" />
              </button>)}
          </div>
        </section>
      </div>
      <SimulationLog key={person.object_id} session={session} person={person}
        groupNames={new Map(groupNames.data?.items.map(group => [group.object_id, group.display_name ?? group.object_id]))} />
    </> : <p>{t("No records.")}</p>}</QueryState> : <section className="flextrix-card">
      <div className="flextrix-section-heading"><h2>{t("Groups")}</h2><button className="secondary-button" onClick={() => setDemo("Create group")}>
        {t("Create group")} · {t("Demonstration")}</button></div>
      <QueryState result={groups}>{result => <DataTable label={t("Groups")} rows={result.items} rowKey={row => row.object_id} columns={[
        { label: t("Group"), render: row => <button className="secondary-button" onClick={() => setDetails({ kind: "groups", id: row.object_id })}>{row.display_name ?? row.object_id}</button> },
        { label: t("Direct members"), render: row => row.membership_count },
      ]} />}</QueryState>
    </section>}
    {targets && page(targets.next_after)}
    {details && <DirectoryDetails session={session} kind={details.kind} objectId={details.id} revision={revision}
      refresh={() => setRevision(current => current + 1)} close={() => setDetails(undefined)} />}
    {demo && <Drawer title={t(demo)} close={() => setDemo(undefined)}>
      {demo === "Create Entra ID user" ? <EntraUserPreview token={session.token} /> :
        demo !== "Create group" && person && <p>{person.display_name ?? person.email}</p>}
      {demo !== "Create Entra ID user" && <p role="status">{t("Demonstration only. No changes are sent to Microsoft Entra ID.")}</p>}
    </Drawer>}
  </div>;
}

export function FlextrixWorkspace({ page, session, navigate }: { page: string; session: Session; navigate: (page: string) => void }) {
  if (page === "Access" && session.permissions.includes("entra:read")) return <AccessWorkspace session={session} />;
  if (page === "Tickets" && session.permissions.includes("entra:approve_change")) return <ServiceNowPage session={session} />;
  if (page === "Logs" && (session.permissions.includes("audit:read") || session.permissions.includes("entra:approve_change"))) return <div className="flextrix-workspace">
    <Banner title="Logs" description="Review access operations and their results." />
    <SimulationLog session={session} />
    {session.permissions.includes("audit:read") && <details className="flextrix-card"><summary>{t("Audit Logs")}</summary><AuditPage session={session} /></details>}
  </div>;
  if (page === "Home") return <div className="flextrix-workspace">
    <Banner title="Access Operations Center" description="Find users, review ServiceNow requests and follow access activity." />
    <div className="flextrix-home-grid">
      {[
        { label: "Access", icon: Users, tone: "teal", enabled: session.permissions.includes("entra:read") },
        { label: "Tickets", icon: Ticket, tone: "violet", enabled: session.permissions.includes("entra:approve_change") },
        { label: "Logs", icon: Activity, tone: "amber", enabled: session.permissions.some(value => value === "audit:read" || value === "entra:approve_change") },
      ].filter(item => item.enabled).map(({ label, icon: Icon, tone }) => <button key={label} className="flextrix-card flextrix-home-link" onClick={() => navigate(label)}>
        <span className={`flextrix-action-icon ${tone}`}><Icon aria-hidden="true" /></span><strong>{t(label)}</strong><ChevronRight aria-hidden="true" />
      </button>)}
    </div>
    <SimulationLog session={session} />
  </div>;
  return <div className="flextrix-card"><h1>{t(page)}</h1><p role="alert">{t("Your account does not have permission to open this module.")}</p></div>;
}
