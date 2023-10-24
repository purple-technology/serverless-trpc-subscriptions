import { appSubscriptions } from "../root";
import { dynamodb } from "@serverless-trpc-subscriptions/adaptor-websocket/disconnect";
import { Table } from "sst/node/table";
import { dynamoDBClient } from "../dynamodb";

export const main = appSubscriptions.disconnect({
  store: dynamodb({
    tableName: Table.Subscriptions.tableName,
    dynamoDBClient,
  }),
});
