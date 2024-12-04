import type { ServerContext } from "../types";
import { formatBytes } from "../util";
import { renderIp } from "./ip";

export function SourceBandwidth({ ctx }: { ctx: ServerContext }) {
  const bandwidth = ctx.store.getSourceBandwidth();

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Destination IP</th>
            <th>Inbound</th>
            <th>Outbound</th>
          </tr>
        </thead>
        <tbody>
          {bandwidth.map(({ srcIp, inBytes, inPkts, outBytes, outPkts }) => (
            <tr key={srcIp}>
              <td>{renderIp(srcIp)}</td>
              <td>
                {formatBytes(inBytes)} ({inPkts})
              </td>
              <td>
                {formatBytes(outBytes)} ({outPkts})
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
