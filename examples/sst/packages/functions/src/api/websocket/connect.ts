import { appSubscriptions } from "../root";
import { dynamodb } from "@serverless-trpc-subscriptions/adaptor-websocket/connect";
import { Table } from "sst/node/table";
import { dynamoDBClient } from "../dynamodb";

export const main = appSubscriptions.connect({
  store: dynamodb({
    dynamoDBClient,
    tableName: Table.Subscriptions.tableName,
  }),
});
