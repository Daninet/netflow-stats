import type { ServerContext } from "../types.js";
import { formatBytes, formatDate } from "../util.js";
import { renderIp } from "./ip.js";

export function ConnectionList({ ctx }: { ctx: ServerContext }) {
  const sources = ctx.store.getSources();

  return (
    <table>
      <thead>
        <tr>
          <th>Source IP</th>
          <th>Destination IP</th>
          <th>Inbound</th>
          <th>Outbound</th>
          <th>Last seen</th>
        </tr>
      </thead>
      <tbody>
        {sources.map(({ srcIp, dst }) =>
          dst.map(
            ({ dstIp, inBytes, inPkts, outBytes, outPkts, lastSeenAt }) => (
              <tr key={srcIp + dstIp}>
                <td>{renderIp(srcIp)}</td>
                <td>{renderIp(dstIp)}</td>
                <td>
                  {formatBytes(inBytes)} ({inPkts})
                </td>
                <td>
                  {formatBytes(outBytes)} ({outPkts})
                </td>
                <td>{formatDate(new Date(lastSeenAt))}</td>
              </tr>
            )
          )
        )}
      </tbody>
    </table>
  );
}
