import { dynamodb } from "@serverless-trpc-subscriptions/adaptor-websocket";
import { issuesRouter } from "./routers/issues/issues";
import { subscriptions, t } from "./trpc";
import { Table } from "sst/node/table";
import { dynamoDBClient } from "./dynamodb";

export const appRouter = t.router({
  issues: issuesRouter,
});

export type AppRouter = typeof appRouter;

export const appSubscriptions = subscriptions
  .router({ router: appRouter })
  .store({
    store: dynamodb({
      tableName: Table.Subscriptions.tableName,
      dynamoDBClient,
    }),
  })
  .routes.issues.onCreated.filter({
    name: "lane",
    input: { lane: true },
  });
