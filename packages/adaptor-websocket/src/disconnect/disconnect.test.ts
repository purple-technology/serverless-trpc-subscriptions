import "aws-sdk-client-mock-jest";
import { expect, test } from "vitest";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  QueryCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { initSubscriptions } from "../subscriptions/subscriptions";
import { APIGatewayProxyWebsocketEventV2, Context } from "aws-lambda";
import {
  ConnectionByConnectionId,
  SubscriptionByConnectionId,
} from "../dynamodb/table";
import { dynamodb } from "../dynamodb/combined";

test("when disconnected it deletes connections and subscriptions from dynamodb", async () => {
  const tableName = "tableName";
  const dynamoDBClient = new DynamoDBClient();
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);
  const subscriptions = initSubscriptions();

  const t = initTRPC.create();
  const router = t.router({
    mySubscription: t.procedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .subscription(subscriptions.resolver<string>()),
  });

  const subscriptionsWithRouter = subscriptions.router({ router }).store({
    store: dynamodb({
      tableName,
      dynamoDBClient,
    }),
  });

  const main = subscriptionsWithRouter.disconnect();

  const event = {
    requestContext: {
      connectionId: "connectionId",
    },
  } as APIGatewayProxyWebsocketEventV2;

  const items: Array<ConnectionByConnectionId | SubscriptionByConnectionId> = [
    {
      pk: "connection#connectionId",
      sk: "connection#connectionId",
      type: "connection",
      expireAt: 0,
    },
    {
      pk: "connection#connectionId",
      sk: "subscription#1",
      type: "subscription",
      path: "mySubscription",
      input: {
        id: "id",
      },
      ctx: undefined,
      id: "1",
      connectionId: "connectionId",
      expireAt: 0,
    },
  ];

  dynamoDBClientMock.on(QueryCommand).resolves({
    Items: items,
  });

  dynamoDBClientMock.on(DeleteCommand).resolves({});

  expect(await main(event, {} as Context, () => {})).toEqual({
    statusCode: 200,
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
    TableName: tableName,
    Key: {
      pk: "connection#connectionId",
      sk: "connection#connectionId",
    },
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
    TableName: tableName,
    Key: {
      pk: "connection#connectionId",
      sk: "subscription#1",
    },
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
    TableName: tableName,
    Key: {
      pk: "path#mySubscription",
      sk: "connection#connectionId#subscription#1",
    },
  });
});

test("when disconnected with input filters it deletes connections and subscriptions", async () => {
  const tableName = "tableName";
  const dynamoDBClient = new DynamoDBClient();
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);
  const subscriptions = initSubscriptions();

  const t = initTRPC.create();
  const router = t.router({
    mySubscription: t.procedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .subscription(subscriptions.resolver<string>()),
  });

  const main = subscriptions
    .router({ router })
    .routes.mySubscription.filter({ name: "id", input: { id: true } })
    .store({ store: dynamodb({ tableName, dynamoDBClient }) })
    .disconnect();

  const event = {
    requestContext: {
      connectionId: "connectionId",
    },
  } as APIGatewayProxyWebsocketEventV2;

  const items: Array<ConnectionByConnectionId | SubscriptionByConnectionId> = [
    {
      pk: "connection#connectionId",
      sk: "connection#connectionId",
      type: "connection",
      expireAt: 0,
    },
    {
      pk: "connection#connectionId",
      sk: "subscription#1",
      type: "subscription",
      path: "mySubscription",
      input: {
        id: "id1",
      },
      ctx: undefined,
      id: "1",
      connectionId: "connectionId",
      expireAt: 0,
    },
  ];

  dynamoDBClientMock.on(QueryCommand).resolves({
    Items: items,
  });

  dynamoDBClientMock.on(DeleteCommand).resolves({});

  expect(await main(event, {} as Context, () => {})).toEqual({
    statusCode: 200,
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
    TableName: tableName,
    Key: {
      pk: "connection#connectionId",
      sk: "connection#connectionId",
    },
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
    TableName: tableName,
    Key: {
      pk: "connection#connectionId",
      sk: "subscription#1",
    },
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
    TableName: tableName,
    Key: {
      pk: "path#mySubscription",
      sk: "name#id#input#id#id1#connection#connectionId#subscription#1",
    },
  });
});

test("when disconnected with ctx filters it deletes connections and subscriptions", async () => {
  const tableName = "tableName";
  const dynamoDBClient = new DynamoDBClient();
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);
  const subscriptions = initSubscriptions();

  const t = initTRPC
    .context<{
      userId: string;
    }>()
    .create();

  const router = t.router({
    mySubscription: t.procedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .subscription(subscriptions.resolver<string>()),
  });

  const main = subscriptions
    .router({ router })
    .routes.mySubscription.filter({
      name: "userIdAndId",
      input: { id: true },
      ctx: { userId: true },
    })
    .store({
      store: dynamodb({
        tableName,
        dynamoDBClient,
      }),
    })
    .disconnect();

  const event = {
    requestContext: {
      connectionId: "connectionId",
    },
  } as APIGatewayProxyWebsocketEventV2;

  const items: Array<ConnectionByConnectionId | SubscriptionByConnectionId> = [
    {
      pk: "connection#connectionId",
      sk: "connection#connectionId",
      type: "connection",
      expireAt: 0,
    },
    {
      pk: "connection#connectionId",
      sk: "subscription#1",
      type: "subscription",
      path: "mySubscription",
      input: {
        id: "id1",
      },
      ctx: {
        userId: "userId",
      },
      id: "1",
      connectionId: "connectionId",
      expireAt: 0,
    },
  ];

  dynamoDBClientMock.on(QueryCommand).resolves({
    Items: items,
  });

  dynamoDBClientMock.on(DeleteCommand).resolves({});

  expect(await main(event, {} as Context, () => {})).toEqual({
    statusCode: 200,
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
    TableName: tableName,
    Key: {
      pk: "connection#connectionId",
      sk: "connection#connectionId",
    },
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
    TableName: tableName,
    Key: {
      pk: "connection#connectionId",
      sk: "subscription#1",
    },
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
    TableName: tableName,
    Key: {
      pk: "path#mySubscription",
      sk: "name#userIdAndId#ctx#userId#userId#input#id#id1#connection#connectionId#subscription#1",
    },
  });
});
