import { appSubscriptions } from "src/api/root";
import { WebSocketApi } from "sst/node/websocket-api";

export const publisher = appSubscriptions.publisher({
  endpoint: WebSocketApi.WebsocketApi.httpsUrl,
});
