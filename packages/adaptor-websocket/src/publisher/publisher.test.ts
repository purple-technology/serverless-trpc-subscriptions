import "aws-sdk-client-mock-jest";
import { initTRPC } from "@trpc/server";
import { expect, test } from "vitest";
import { z } from "zod";
import { initSubscriptions } from "../subscriptions/subscriptions";
import { dynamodb } from "./publisher.dynamo";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { SubscriptionByPath } from "../dynamodb/table";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { TRPCResponseMessage } from "@trpc/server/rpc";

test("when publishing a subscription it queries dynamodb and sends data", async () => {
  const tableName = "tableName";
  const subscriptions = initSubscriptions();
  const t = initTRPC.create();
  const dynamoDBClient = new DynamoDBClient({});
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);
  const apigatewayMock = mockClient(ApiGatewayManagementApiClient);

  const router = t.router({
    mySubscription: t.procedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .subscription(subscriptions.resolver<string>()),
  });

  const subscriptionsByPath: Array<SubscriptionByPath> = [
    {
      pk: `path#mySubscription`,
      sk: `connection#connectionId#subscription#1`,
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
    Items: subscriptionsByPath,
  });

  apigatewayMock.on(PostToConnectionCommand).resolves({});

  const subscriptionsWithRouter = subscriptions.router({ router }).publisher({
    store: dynamodb({
      tableName: "tableName",
      dynamoDBClient,
    }),
    endpoint: "endpoint",
  });

  await subscriptionsWithRouter.routes.mySubscription.publish({
    data: "hi",
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(QueryCommand, {
    TableName: tableName,
    KeyConditionExpression: "pk = :pk and begins_with(sk, :sk)",
    ExpressionAttributeValues: {
      ":pk": "path#mySubscription",
      ":sk": "",
    },
  });

  const message: TRPCResponseMessage = {
    id: "1",
    jsonrpc: "2.0",
    result: {
      type: "data",
      data: "hi",
    },
  };

  expect(apigatewayMock).toHaveReceivedCommandWith(PostToConnectionCommand, {
    ConnectionId: "connectionId",
    Data: Buffer.from(JSON.stringify(message)),
  });
});

test("when publishing a subscription with input it queries dynamodb and sends data", async () => {
  const tableName = "tableName";
  const subscriptions = initSubscriptions();
  const t = initTRPC.create();
  const dynamoDBClient = new DynamoDBClient({});
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);
  const apigatewayMock = mockClient(ApiGatewayManagementApiClient);

  const router = t.router({
    mySubscription: t.procedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .subscription(subscriptions.resolver<string>()),
  });

  const subscriptionsByPath: Array<SubscriptionByPath> = [
    {
      pk: `path#mySubscription`,
      sk: `name#id#input#id#id1#connection#connectionId#subscription#1`,
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
    Items: subscriptionsByPath,
  });

  apigatewayMock.on(PostToConnectionCommand).resolves({});

  const subscriptionsWithRouter = subscriptions
    .router({ router })
    .routes.mySubscription.filter({
      name: "id",
      input: {
        id: true,
      },
    })
    .publisher({
      store: dynamodb({
        tableName: "tableName",
        dynamoDBClient,
      }),
      endpoint: "endpoint",
    });

  await subscriptionsWithRouter.routes.mySubscription.publish({
    data: "hi",
    filter: {
      name: "id",
      input: {
        id: "id1",
      },
    },
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(QueryCommand, {
    TableName: tableName,
    KeyConditionExpression: "pk = :pk and begins_with(sk, :sk)",
    ExpressionAttributeValues: {
      ":pk": "path#mySubscription",
      ":sk": "name#id#input#id#id1",
    },
  });

  const message: TRPCResponseMessage = {
    id: "1",
    jsonrpc: "2.0",
    result: {
      type: "data",
      data: "hi",
    },
  };

  expect(apigatewayMock).toHaveReceivedCommandWith(PostToConnectionCommand, {
    ConnectionId: "connectionId",
    Data: Buffer.from(JSON.stringify(message)),
  });
});

test("when publishing a subscription with ctx it queries dynamodb and sends data", async () => {
  const tableName = "tableName";
  const subscriptions = initSubscriptions();
  const t = initTRPC.context<{ userId: string }>().create();
  const dynamoDBClient = new DynamoDBClient({});
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);
  const apigatewayMock = mockClient(ApiGatewayManagementApiClient);

  const router = t.router({
    mySubscription: t.procedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .subscription(subscriptions.resolver<string>()),
  });

  const subscriptionsByPath: Array<SubscriptionByPath> = [
    {
      pk: `path#mySubscription`,
      sk: `name#userId#ctx#userId#userId#connection#connectionId#subscription#1`,
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
    Items: subscriptionsByPath,
  });

  apigatewayMock.on(PostToConnectionCommand).resolves({});

  const subscriptionsWithRouter = subscriptions
    .router({ router })
    .routes.mySubscription.filter({
      name: "userId",
      ctx: {
        userId: true,
      },
    })
    .publisher({
      store: dynamodb({
        tableName: "tableName",
        dynamoDBClient,
      }),
      endpoint: "endpoint",
    });

  await subscriptionsWithRouter.routes.mySubscription.publish({
    data: "hi",
    filter: {
      name: "userId",
      ctx: {
        userId: "userId",
      },
    },
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(QueryCommand, {
    TableName: tableName,
    KeyConditionExpression: "pk = :pk and begins_with(sk, :sk)",
    ExpressionAttributeValues: {
      ":pk": "path#mySubscription",
      ":sk": "name#userId#ctx#userId#userId",
    },
  });

  const message: TRPCResponseMessage = {
    id: "1",
    jsonrpc: "2.0",
    result: {
      type: "data",
      data: "hi",
    },
  };

  expect(apigatewayMock).toHaveReceivedCommandWith(PostToConnectionCommand, {
    ConnectionId: "connectionId",
    Data: Buffer.from(JSON.stringify(message)),
  });
});

test("when publising a subscription with ctx and input it queries dynamodb and sends data", async () => {
  const tableName = "tableName";
  const subscriptions = initSubscriptions();
  const t = initTRPC.context<{ userId: string }>().create();
  const dynamoDBClient = new DynamoDBClient({});
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);
  const apigatewayMock = mockClient(ApiGatewayManagementApiClient);

  const router = t.router({
    mySubscription: t.procedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .subscription(subscriptions.resolver<string>()),
  });

  const subscriptionsByPath: Array<SubscriptionByPath> = [
    {
      pk: `path#mySubscription`,
      sk: `name#userIdAndId#ctx#userId#userId#input#id#id#connection#connectionId#subscription#1`,
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
    Items: subscriptionsByPath,
  });

  apigatewayMock.on(PostToConnectionCommand).resolves({});

  const subscriptionsWithRouter = subscriptions
    .router({ router })
    .routes.mySubscription.filter({
      name: "userIdAndId",
      input: {
        id: true,
      },
      ctx: {
        userId: true,
      },
    })
    .publisher({
      store: dynamodb({
        tableName: "tableName",
        dynamoDBClient,
      }),
      endpoint: "endpoint",
    });

  await subscriptionsWithRouter.routes.mySubscription.publish({
    data: "hi",
    filter: {
      name: "userIdAndId",
      input: {
        id: "id",
      },
      ctx: {
        userId: "userId",
      },
    },
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(QueryCommand, {
    TableName: tableName,
    KeyConditionExpression: "pk = :pk and begins_with(sk, :sk)",
    ExpressionAttributeValues: {
      ":pk": "path#mySubscription",
      ":sk": "name#userIdAndId#ctx#userId#userId#input#id#id",
    },
  });

  const message: TRPCResponseMessage = {
    id: "1",
    jsonrpc: "2.0",
    result: {
      type: "data",
      data: "hi",
    },
  };

  expect(apigatewayMock).toHaveReceivedCommandWith(PostToConnectionCommand, {
    ConnectionId: "connectionId",
    Data: Buffer.from(JSON.stringify(message)),
  });
});

test("when publishing a subcription with ctx or input and ctx is used it queries dynamodb and sends data", async () => {
  const tableName = "tableName";
  const subscriptions = initSubscriptions();
  const t = initTRPC.context<{ userId: string }>().create();
  const dynamoDBClient = new DynamoDBClient({});
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);
  const apigatewayMock = mockClient(ApiGatewayManagementApiClient);

  const router = t.router({
    mySubscription: t.procedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .subscription(subscriptions.resolver<string>()),
  });

  const subscriptionsByPath: Array<SubscriptionByPath> = [
    {
      pk: `path#mySubscription`,
      sk: `name#userId#ctx#userId#userId#connection#connectionId#subscription#1`,
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
    Items: subscriptionsByPath,
  });

  apigatewayMock.on(PostToConnectionCommand).resolves({});

  const subscriptionsWithRouter = subscriptions
    .router({ router })
    .routes.mySubscription.filter(
      {
        name: "userId",
        ctx: {
          userId: true,
        },
      },
      {
        name: "id",
        input: {
          id: true,
        },
      }
    )
    .publisher({
      store: dynamodb({
        tableName: "tableName",
        dynamoDBClient,
      }),
      endpoint: "endpoint",
    });

  await subscriptionsWithRouter.routes.mySubscription.publish({
    data: "hi",
    filter: {
      name: "userId",
      ctx: {
        userId: "userId",
      },
    },
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(QueryCommand, {
    TableName: tableName,
    KeyConditionExpression: "pk = :pk and begins_with(sk, :sk)",
    ExpressionAttributeValues: {
      ":pk": "path#mySubscription",
      ":sk": "name#userId#ctx#userId#userId",
    },
  });

  const message: TRPCResponseMessage = {
    id: "1",
    jsonrpc: "2.0",
    result: {
      type: "data",
      data: "hi",
    },
  };

  expect(apigatewayMock).toHaveReceivedCommandWith(PostToConnectionCommand, {
    ConnectionId: "connectionId",
    Data: Buffer.from(JSON.stringify(message)),
  });
});

test("when publishing a subcription with ctx or input and input is used it queries dynamodb and sends data", async () => {
  const tableName = "tableName";
  const subscriptions = initSubscriptions();
  const t = initTRPC.context<{ userId: string }>().create();
  const dynamoDBClient = new DynamoDBClient({});
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);
  const apigatewayMock = mockClient(ApiGatewayManagementApiClient);

  const router = t.router({
    mySubscription: t.procedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .subscription(subscriptions.resolver<string>()),
  });

  const subscriptionsByPath: Array<SubscriptionByPath> = [
    {
      pk: `path#mySubscription`,
      sk: `name#id#input#id#connection#connectionId#subscription#1`,
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
    Items: subscriptionsByPath,
  });

  apigatewayMock.on(PostToConnectionCommand).resolves({});

  const subscriptionsWithRouter = subscriptions
    .router({ router })
    .routes.mySubscription.filter(
      {
        name: "userId",
        ctx: {
          userId: true,
        },
      },
      {
        name: "id",
        input: {
          id: true,
        },
      }
    )
    .publisher({
      store: dynamodb({
        tableName: "tableName",
        dynamoDBClient,
      }),
      endpoint: "endpoint",
    });

  await subscriptionsWithRouter.routes.mySubscription.publish({
    data: "hi",
    filter: {
      name: "id",
      input: {
        id: "id1",
      },
    },
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(QueryCommand, {
    TableName: tableName,
    KeyConditionExpression: "pk = :pk and begins_with(sk, :sk)",
    ExpressionAttributeValues: {
      ":pk": "path#mySubscription",
      ":sk": "name#id#input#id#id1",
    },
  });

  const message: TRPCResponseMessage = {
    id: "1",
    jsonrpc: "2.0",
    result: {
      type: "data",
      data: "hi",
    },
  };

  expect(apigatewayMock).toHaveReceivedCommandWith(PostToConnectionCommand, {
    ConnectionId: "connectionId",
    Data: Buffer.from(JSON.stringify(message)),
  });
});
