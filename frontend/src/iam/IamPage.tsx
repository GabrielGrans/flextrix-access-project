import { QueryState } from "./common";
import { useQuery } from "./data";
import { FlextrixWorkspace } from "./FlextrixWorkspace";

export function IamPage({ page, token, employeeId, navigate }: {
  page: string; token: string; employeeId: number; navigate: (page: string) => void;
}) {
  const result = useQuery<string[]>(token, "/auth/me/permissions");
  return <QueryState result={result}>{permissions =>
    <FlextrixWorkspace page={page} session={{ token, employeeId, permissions }} navigate={navigate} />
  }</QueryState>;
}
