import type { Store } from "./store";

export interface ServerContext {
  url: string;
  store: Store;
}
