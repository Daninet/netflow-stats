import type { ServerContext } from "../types";
import { formatBytes, formatDuration, roundToDecimal } from "../util";

export function Statistics({ ctx }: { ctx: ServerContext }) {
  const statistics = ctx.store.getStatistics();

  return (
    <table>
      <tbody>
        <tr>
          <td>
            Errors: <strong>{statistics.errors}</strong>
          </td>
          <td>
            Missed UDP: <strong>{statistics.missedUDP}</strong>
          </td>
          <td>
            Records handled: <strong>{statistics.recordsHandled}</strong>
          </td>
        </tr>

        <tr>
          <td>
            Flows handled: <strong>{statistics.flowsHandled}</strong>
          </td>
          <td>
            Total packets: <strong>{statistics.totalPackets}</strong>
          </td>
          <td>
            Total bytes: <strong>{formatBytes(statistics.totalBytes)}</strong>
          </td>
        </tr>

        <tr>
          <td>
            Connections stored:{" "}
            <strong>{statistics.totalConnectionsStored}</strong>
          </td>
          <td>
            Memory used: <strong>{formatBytes(statistics.memoryUsage)}</strong>
          </td>
          <td>
            Uptime: <strong>{formatDuration(statistics.uptime)}</strong>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
