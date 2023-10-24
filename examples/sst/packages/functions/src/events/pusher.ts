import { appSubscriptions } from "src/api/root";
import { dynamodb } from "../../../../../../packages/adaptor-websocket/src/pusher";
import { Table } from "sst/node/table";
import { dynamoDBClient } from "src/api/dynamodb";
import { WebSocketApi } from "sst/node/websocket-api";

export const pusher = appSubscriptions.pusher({
  store: dynamodb({ tableName: Table.Subscriptions.tableName, dynamoDBClient }),
  endpoint: WebSocketApi.WebsocketApi.httpsUrl,
});
