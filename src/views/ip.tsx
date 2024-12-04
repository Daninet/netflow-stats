import { resolve } from "../resolver.js";

export function renderIp(ip: string) {
  const data = resolve(ip);
  const label = data.hostname ? `${data.hostname} (${ip})` : ip;

  const tooltip = `${data.asn || ""}${data.name || ""}`;

  return (
    <span title={tooltip}>
      {data.country ? (
        <span
          class={`fi fi-${data.country.toLowerCase()}`}
          style={{ marginRight: "2px" }}
        />
      ) : null}
      {label}
    </span>
  );
}
