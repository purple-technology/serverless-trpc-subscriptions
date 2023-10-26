import { appSubscriptions } from "src/api/trpc";
import { WebSocketApi } from "sst/node/websocket-api";

export const publisher = appSubscriptions.publisher({
  endpoint: WebSocketApi.WebSocketApi.httpsUrl,
});
