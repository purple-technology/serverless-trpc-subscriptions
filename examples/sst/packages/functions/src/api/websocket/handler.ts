import { appSubscriptions } from "../root";
import { dynamodb } from "@serverless-trpc-subscriptions/adaptor-websocket/handler";
import { Table } from "sst/node/table";
import { dynamoDBClient } from "../dynamodb";

export const main = appSubscriptions.handler({
  store: dynamodb({
    tableName: Table.Subscriptions.tableName,
    dynamoDBClient,
  }),
});
