import { appSubscriptions } from "src/api/root";
import { dynamodb } from "@serverless-trpc-subscriptions/adaptor-websocket/publisher";
import { Table } from "sst/node/table";
import { dynamoDBClient } from "src/api/dynamodb";
import { WebSocketApi } from "sst/node/websocket-api";

export const publisher = appSubscriptions.publisher({
  store: dynamodb({ tableName: Table.Subscriptions.tableName, dynamoDBClient }),
  endpoint: WebSocketApi.WebsocketApi.httpsUrl,
});
