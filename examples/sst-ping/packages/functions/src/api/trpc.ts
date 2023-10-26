import { initTRPC } from "@trpc/server";
import {
  dynamodb,
  initSubscriptions,
} from "@serverless-trpc-subscriptions/adaptor-websocket";
import { z } from "zod";
import { Table } from "sst/node/table";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const t = initTRPC.create();

const subscriptions = initSubscriptions();

const appRouter = t.router({
  onPing: t.procedure
    .input(
      z.object({
        name: z.string(),
      })
    )
    .subscription(subscriptions.resolver<"ping">()),
});

export type AppRouter = typeof appRouter;

export const appSubscriptions = subscriptions
  .router({ router: appRouter })
  .store({
    store: dynamodb({
      tableName: Table.Subscriptions.tableName,
      dynamoDBClient: new DynamoDBClient({}),
    }),
  })
  .routes.onPing.filter({
    name: "name",
    input: {
      name: true,
    },
  });
