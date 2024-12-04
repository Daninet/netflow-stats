import type { ServerContext } from "./types";
import { ConnectionList } from "./views/connections";
import { SourceBandwidth } from "./views/sourceBandwidth";
import { Statistics } from "./views/statistics";

export function renderRoute(ctx: ServerContext) {
  const url = ctx.url;
  if (url === "/")
    return (
      <>
        <Statistics ctx={ctx} />
        <SourceBandwidth ctx={ctx} />
        <ConnectionList ctx={ctx} />
      </>
    );
}
