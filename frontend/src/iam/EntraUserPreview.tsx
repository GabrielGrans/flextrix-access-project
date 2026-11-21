import { useState } from "react";
import { t } from "../i18n";
import { QueryState } from "./common";
import { useQuery } from "./data";

const tenantDomain = import.meta.env.VITE_ENTRA_UPN_DOMAIN?.trim().replace(/^@/, "") || "contoso.onmicrosoft.com";
const domain = "@" + tenantDomain;
const steps = ["Basics", "Properties", "Assignments", "Review and create"];
const sections = [
  ["Identity", "First name", "Last name", "User type", "Certificate user IDs"],
  ["Work information", "Job title", "Company name", "Department", "Employee ID", "Employee type", "Hire date", "Office location", "Manager UPN"],
  ["Contact information", "Street address", "City", "State or province", "Postal code", "Country or region", "Business phone", "Mobile phone", "Email", "Other emails", "Fax number"],
  ["Parental controls", "Age group", "Consent provided for minor"],
  ["Settings", "Usage location"],
];
const choices: Record<string, string[]> = {
  "User type": ["Member", "Guest"],
  "Age group": ["Minor", "Not adult", "Adult"],
  "Consent provided for minor": ["Granted", "Denied", "Not required"],
};
const fieldTypes: Record<string, string> = {
  "Hire date": "date", "Email": "email", "Manager UPN": "email",
  "Business phone": "tel", "Mobile phone": "tel", "Fax number": "tel",
};
const passwordSets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%&*?"];

function randomIndex(length: number) {
  const buffer = new Uint8Array(1);
  const limit = 256 - 256 % length;
  do { crypto.getRandomValues(buffer); } while (buffer[0] >= limit);
  return buffer[0] % length;
}

function generatePassword() {
  const alphabet = passwordSets.join("");
  const characters = passwordSets.map(set => set[randomIndex(set.length)]);
  while (characters.length < 12) characters.push(alphabet[randomIndex(alphabet.length)]);
  for (let i = characters.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [characters[i], characters[j]] = [characters[j], characters[i]];
  }
  return characters.join("");
}

type Group = { object_id: string; display_name: string | null };

export function EntraUserPreview({ token }: { token: string }) {
  const [step, setStep] = useState(0);
  const [upn, setUpn] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState(generatePassword);
  const [showPassword, setShowPassword] = useState(false);
  const [properties, setProperties] = useState<Record<string, string>>({ "User type": "Member" });
  const [selectedGroups, setSelectedGroups] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [cursors, setCursors] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);

  const params = new URLSearchParams({ limit: "25", query: search.trim() });
  const after = cursors.at(-1);
  if (after !== undefined) params.set("after", String(after));
  const groups = useQuery<{ items: Group[]; next_after: number | null }>(token,
    step === 2 ? `/entra/directory/groups?${params}` : null);

  function toggleGroup(group: Group) {
    setSelectedGroups(current => {
      const next = { ...current };
      if (group.object_id in next) delete next[group.object_id];
      else next[group.object_id] = group.display_name ?? group.object_id;
      return next;
    });
  }

  if (finished) return <p role="status">{t("Simulation completed. No account or group memberships were created.")}</p>;

  return <div className="flextrix-entra-wizard">
    <p>{t("Demonstration only. No changes are sent to Microsoft Entra ID.")}</p>
    <ol className="flextrix-wizard-steps" aria-label={t("Registration steps")}>
      {steps.map((label, index) =>
        <li key={label} aria-current={step === index ? "step" : undefined}>{t(label)}</li>)}
    </ol>
    <form className="iam-form" onSubmit={event => {
      event.preventDefault();
      if (step === steps.length - 1) {
        setPassword("");
        setFinished(true);
      } else {
        setShowPassword(false);
        setStep(step + 1);
      }
    }}>
      {step === 0 && <>
        <label>{t("User principal name (UPN)")}
          <span className="flextrix-upn">
            <input required name="upn" value={upn} onChange={event => setUpn(event.target.value)}
              maxLength={64} pattern={String.raw`[A-Za-z0-9_.\-]+`} aria-describedby="flextrix-upn-domain" />
            <span id="flextrix-upn-domain">{domain}</span>
          </span>
        </label>
        <label>{t("Display name")}
          <input required value={name} maxLength={256} pattern=".*\S.*" onChange={event => setName(event.target.value)} />
        </label>
        <label>{t("Temporary password (12 characters)")}
          <input readOnly type={showPassword ? "text" : "password"} autoComplete="off" value={password} />
        </label>
        <div className="iam-actions">
          <button className="secondary-button" type="button" onClick={() => setShowPassword(value => !value)}>
            {t(showPassword ? "Hide password" : "Show password")}
          </button>
          <button className="secondary-button" type="button" onClick={() => setPassword(generatePassword())}>
            {t("Generate password")}
          </button>
        </div>
      </>}
      {step === 1 && sections.map(([section, ...fields]) => <fieldset key={section} className="flextrix-property-group">
        <legend>{t(section)}</legend>
        {fields.map(field => {
          const value = properties[field] ?? "";
          const onChange = (next: string) => setProperties(current => ({ ...current, [field]: next }));
          return <label key={field}>{t(field)}
            {choices[field] ? <select value={value} onChange={event => onChange(event.target.value)}>
              {field !== "User type" && <option value="">—</option>}
              {choices[field].map(option => <option key={option} value={option}>{t(option)}</option>)}
            </select> : <input type={fieldTypes[field] ?? "text"} maxLength={256}
              value={value} onChange={event => onChange(event.target.value)} />}
          </label>;
        })}
      </fieldset>)}
      {step === 2 && <>
        <label>{t("Search groups")}
          <input type="search" value={search} maxLength={150} onChange={event => {
            setSearch(event.target.value);
            setCursors([]);
          }} />
        </label>
        <QueryState result={groups}>{({ items, next_after: next }) => <>
          {items.length === 0 && <p>{t("No records.")}</p>}
          <div className="flextrix-group-options">{items.map(group =>
            <label key={group.object_id}>
              <input type="checkbox" checked={group.object_id in selectedGroups} onChange={() => toggleGroup(group)} />
              {group.display_name ?? group.object_id}
            </label>)}</div>
          <div className="iam-actions">
            {cursors.length > 0 && <button type="button" className="secondary-button" onClick={() => setCursors(cursors.slice(0, -1))}>{t("Previous page")}</button>}
            {next !== null && <button type="button" className="secondary-button" onClick={() => setCursors([...cursors, next])}>{t("Next page")}</button>}
          </div>
        </>}</QueryState>
        <strong>{t("Selected groups")}</strong>
        {Object.keys(selectedGroups).length === 0 ? <p>{t("No groups selected.")}</p> :
          <ul>{Object.entries(selectedGroups).map(([id, label]) => <li key={id}>{label}</li>)}</ul>}
      </>}
      {step === 3 && <>
        <dl className="flextrix-review">
          <dt>{t("User principal name (UPN)")}</dt><dd>{upn}{domain}</dd>
          <dt>{t("Display name")}</dt><dd>{name.trim()}</dd>
          <dt>{t("Temporary password (12 characters)")}</dt><dd>{t("Generated")}</dd>
          {Object.entries(properties).filter(([, value]) => value.trim()).map(([field, value]) =>
            <div key={field}><dt>{t(field)}</dt><dd>{choices[field] ? t(value) : value}</dd></div>)}
          <dt>{t("Selected groups")}</dt><dd>{Object.values(selectedGroups).join(", ") || t("No groups selected.")}</dd>
        </dl>
      </>}
      <div className="iam-actions flextrix-wizard-footer">
        {step > 0 && <button className="secondary-button" type="button" onClick={() => setStep(step - 1)}>{t("Back")}</button>}
        <button className="primary-button" type="submit">{t(step === steps.length - 1 ? "Simulate creation" : "Next")}</button>
      </div>
    </form>
  </div>;
}
