import "aws-sdk-client-mock-jest";
import { test, expect, vi, beforeAll, beforeEach } from "vitest";
import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { initSubscriptions } from "../subscriptions/subscriptions";
import { APIGatewayProxyWebsocketEventV2, Context } from "aws-lambda";
import { TRPCClientOutgoingMessage } from "@trpc/server/rpc";
import {
  DeleteCommand,
  PutCommand,
  QueryCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import {
  Subscription,
  SubscriptionByConnectionId,
  SubscriptionByPath,
} from "../dynamodb/table";
import { afterEach } from "node:test";
import { dynamodb } from "../dynamodb/combined";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
});

test("when subscription is started it is put into dynamodb and posts started message", async () => {
  const dynamoDBClient = new DynamoDBClient({});
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);
  const apigatewayMock = mockClient(ApiGatewayManagementApiClient);

  const subscriptions = initSubscriptions();

  const tableName = "tableName";
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
    .store({
      store: dynamodb({
        tableName,
        dynamoDBClient,
      }),
    })
    .handler();

  const message: TRPCClientOutgoingMessage = {
    id: "1",
    method: "subscription",
    params: {
      path: "mySubscription",
      input: { id: "id1" },
    },
  };

  const event = {
    body: JSON.stringify(message),
    requestContext: {
      connectionId: "connectionId",
    },
  } as APIGatewayProxyWebsocketEventV2;

  apigatewayMock.on(PostToConnectionCommand).resolves({});

  dynamoDBClientMock.on(PutCommand).resolves({});

  expect(await main(event, {} as Context, () => {})).toEqual({
    statusCode: 200,
  });

  const subscription: Subscription = {
    type: "subscription",
    path: "mySubscription",
    input: {
      id: "id1",
    },
    ctx: undefined,
    id: "1",
    connectionId: "connectionId",
    expireAt: 14400,
  };

  const subscriptionByConnectionId: SubscriptionByConnectionId = {
    ...subscription,
    pk: "connection#connectionId",
    sk: "subscription#1",
  };

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(PutCommand, {
    Item: subscriptionByConnectionId,
    TableName: tableName,
  });

  const subscriptionByPath: SubscriptionByPath = {
    ...subscription,
    pk: `path#mySubscription`,
    sk: `connection#connectionId#subscription#1`,
  };

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(PutCommand, {
    Item: subscriptionByPath,
    TableName: tableName,
  });

  expect(apigatewayMock).toHaveReceivedCommandWith(PostToConnectionCommand, {
    ConnectionId: "connectionId",
    Data: Buffer.from(
      JSON.stringify({
        id: message.id,
        jsonrpc: message.jsonrpc,
        result: {
          type: "started",
        },
      })
    ),
  });
});

test("when subscription is stopped it is deleted from dynamodb and posts stopped message", async () => {
  const dynamoDBClient = new DynamoDBClient({});
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);
  const apigatewayMock = mockClient(ApiGatewayManagementApiClient);

  const tableName = "tableName";
  const t = initTRPC.create();
  const subscriptions = initSubscriptions();

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
    .store({
      store: dynamodb({
        tableName,
        dynamoDBClient,
      }),
    })
    .handler();

  const message: TRPCClientOutgoingMessage = {
    id: "1",
    method: "subscription.stop",
  };

  const event = {
    body: JSON.stringify(message),
    requestContext: {
      connectionId: "connectionId",
    },
  } as APIGatewayProxyWebsocketEventV2;

  apigatewayMock.on(PostToConnectionCommand).resolves({});

  dynamoDBClientMock.on(QueryCommand).resolves({
    Items: [
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
      },
    ],
  });

  dynamoDBClientMock.on(DeleteCommand).resolves({});

  expect(await main(event, {} as Context, () => {})).toEqual({
    statusCode: 200,
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

  expect(apigatewayMock).toHaveReceivedCommandWith(PostToConnectionCommand, {
    ConnectionId: "connectionId",
    Data: Buffer.from(
      JSON.stringify({
        id: message.id,
        jsonrpc: message.jsonrpc,
        result: {
          type: "stopped",
        },
      })
    ),
  });
});

test("when filtering by input and subscription has started it puts the subscription into dynamodb and posts started message", async () => {
  const dynamoDBClient = new DynamoDBClient({});
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);
  const apigatewayMock = mockClient(ApiGatewayManagementApiClient);

  const tableName = "tableName";
  const t = initTRPC.create();
  const subscriptions = initSubscriptions();

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
      name: "id",
      input: {
        id: true,
      },
    })
    .store({
      store: dynamodb({
        tableName,
        dynamoDBClient,
      }),
    })
    .handler();

  const message: TRPCClientOutgoingMessage = {
    id: "1",
    method: "subscription",
    params: {
      path: "mySubscription",
      input: { id: "id1" },
    },
  };

  const event = {
    body: JSON.stringify(message),
    requestContext: {
      connectionId: "connectionId",
    },
  } as APIGatewayProxyWebsocketEventV2;

  apigatewayMock.on(PostToConnectionCommand).resolves({});

  dynamoDBClientMock.on(PutCommand).resolves({});

  expect(await main(event, {} as Context, () => {})).toEqual({
    statusCode: 200,
  });

  const subscription: Subscription = {
    type: "subscription",
    path: "mySubscription",
    input: {
      id: "id1",
    },
    ctx: undefined,
    id: "1",
    connectionId: "connectionId",
    expireAt: 14400,
  };

  const subscriptionByConnectionId: SubscriptionByConnectionId = {
    ...subscription,
    pk: "connection#connectionId",
    sk: "subscription#1",
  };

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(PutCommand, {
    Item: subscriptionByConnectionId,
    TableName: tableName,
  });

  const subscriptionByPathInput: SubscriptionByPath = {
    ...subscription,
    pk: "path#mySubscription",
    sk: "name#id#input#id#id1#connection#connectionId#subscription#1",
  };

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(PutCommand, {
    Item: subscriptionByPathInput,
    TableName: tableName,
  });

  expect(apigatewayMock).toHaveReceivedCommandWith(PostToConnectionCommand, {
    ConnectionId: "connectionId",
    Data: Buffer.from(
      JSON.stringify({
        id: message.id,
        jsonrpc: message.jsonrpc,
        result: {
          type: "started",
        },
      })
    ),
  });
});

test("when filtering by input and subscription has stopped it deleted the subscription from dynamodb and posts stopped message", async () => {
  const dynamoDBClient = new DynamoDBClient({});
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);
  const apigatewayMock = mockClient(ApiGatewayManagementApiClient);

  const tableName = "tableName";
  const t = initTRPC.create();
  const subscriptions = initSubscriptions();

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
      name: "id",
      input: {
        id: true,
      },
    })
    .store({
      store: dynamodb({
        tableName,
        dynamoDBClient,
      }),
    })
    .handler();

  const message: TRPCClientOutgoingMessage = {
    id: "1",
    method: "subscription.stop",
  };

  const event = {
    body: JSON.stringify(message),
    requestContext: {
      connectionId: "connectionId",
    },
  } as APIGatewayProxyWebsocketEventV2;

  apigatewayMock.on(PostToConnectionCommand).resolves({});

  dynamoDBClientMock.on(QueryCommand).resolves({
    Items: [
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
      },
    ],
  });

  expect(await main(event, {} as Context, () => {})).toEqual({
    statusCode: 200,
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
    Key: {
      pk: "connection#connectionId",
      sk: "subscription#1",
    },
    TableName: tableName,
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
    Key: {
      pk: "path#mySubscription",
      sk: "name#id#input#id#id1#connection#connectionId#subscription#1",
    },
    TableName: tableName,
  });

  expect(apigatewayMock).toHaveReceivedCommandWith(PostToConnectionCommand, {
    ConnectionId: "connectionId",
    Data: Buffer.from(
      JSON.stringify({
        id: message.id,
        jsonrpc: message.jsonrpc,
        result: {
          type: "stopped",
        },
      })
    ),
  });
});

test("when filtering by ctx and subscription has started it puts subscriptions into dynamodb", async () => {
  const dynamoDBClient = new DynamoDBClient({});
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);
  const apigatewayMock = mockClient(ApiGatewayManagementApiClient);
  const subscriptions = initSubscriptions();

  const tableName = "tableName";
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
      name: "userId",
      ctx: { userId: true },
    })
    .store({
      store: dynamodb({
        tableName,
        dynamoDBClient,
      }),
    })
    .handler({
      createContext: () => ({ userId: "userId" }),
    });

  const message: TRPCClientOutgoingMessage = {
    id: "1",
    method: "subscription",
    params: {
      path: "mySubscription",
      input: { id: "id1" },
    },
  };

  const event = {
    body: JSON.stringify(message),
    requestContext: {
      connectionId: "connectionId",
    },
  } as APIGatewayProxyWebsocketEventV2;

  apigatewayMock.on(PostToConnectionCommand).resolves({});

  dynamoDBClientMock.on(PutCommand).resolves({});

  expect(await main(event, {} as Context, () => {})).toEqual({
    statusCode: 200,
  });

  const subscription: Subscription = {
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
    expireAt: 14400,
  };

  const subscriptionByConnection: SubscriptionByConnectionId = {
    ...subscription,
    pk: "connection#connectionId",
    sk: "subscription#1",
  };

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(PutCommand, {
    Item: subscriptionByConnection,
    TableName: tableName,
  });

  const subscriptionByPath: SubscriptionByPath = {
    ...subscription,
    pk: "path#mySubscription",
    sk: "name#userId#ctx#userId#userId#connection#connectionId#subscription#1",
  };

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(PutCommand, {
    Item: subscriptionByPath,
    TableName: tableName,
  });

  expect(apigatewayMock).toHaveReceivedCommandWith(PostToConnectionCommand, {
    ConnectionId: "connectionId",
    Data: Buffer.from(
      JSON.stringify({
        id: message.id,
        jsonrpc: message.jsonrpc,
        result: {
          type: "started",
        },
      })
    ),
  });
});

test("when filtering by ctx and subscription has stopped it deleted the subscription from dynamodb and posts stopped message", async () => {
  const dynamoDBClient = new DynamoDBClient({});
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);
  const apigatewayMock = mockClient(ApiGatewayManagementApiClient);
  const subscriptions = initSubscriptions();

  const tableName = "tableName";
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
      name: "userId",
      ctx: {
        userId: true,
      },
    })
    .store({
      store: dynamodb({
        tableName,
        dynamoDBClient,
      }),
    })
    .handler({
      createContext: () => ({
        userId: "userId",
      }),
    });

  const message: TRPCClientOutgoingMessage = {
    id: "1",
    method: "subscription.stop",
  };

  const event = {
    body: JSON.stringify(message),
    requestContext: {
      connectionId: "connectionId",
    },
  } as APIGatewayProxyWebsocketEventV2;

  apigatewayMock.on(PostToConnectionCommand).resolves({});

  dynamoDBClientMock.on(QueryCommand).resolves({
    Items: [
      {
        pk: "connection#connectionId",
        sk: "subscription#1",
        type: "subscription",
        path: "mySubscription",
        input: undefined,
        ctx: {
          userId: "userId",
        },
        id: "1",
      },
    ],
  });

  expect(await main(event, {} as Context, () => {})).toEqual({
    statusCode: 200,
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
    Key: {
      pk: "connection#connectionId",
      sk: "subscription#1",
    },
    TableName: tableName,
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
    Key: {
      pk: "path#mySubscription",
      sk: "name#userId#ctx#userId#userId#connection#connectionId#subscription#1",
    },
    TableName: tableName,
  });

  expect(apigatewayMock).toHaveReceivedCommandWith(PostToConnectionCommand, {
    ConnectionId: "connectionId",
    Data: Buffer.from(
      JSON.stringify({
        id: message.id,
        jsonrpc: message.jsonrpc,
        result: {
          type: "stopped",
        },
      })
    ),
  });
});

test("when filtering by ctx and input and subscription has started it puts subscriptions into dynamodb", async () => {
  const dynamoDBClient = new DynamoDBClient({});
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);
  const apigatewayMock = mockClient(ApiGatewayManagementApiClient);
  const subscriptions = initSubscriptions();

  const tableName = "tableName";
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
    .handler({
      createContext: () => ({ userId: "userId" }),
    });

  const message: TRPCClientOutgoingMessage = {
    id: "1",
    method: "subscription",
    params: {
      path: "mySubscription",
      input: { id: "id1" },
    },
  };

  const event = {
    body: JSON.stringify(message),
    requestContext: {
      connectionId: "connectionId",
    },
  } as APIGatewayProxyWebsocketEventV2;

  apigatewayMock.on(PostToConnectionCommand).resolves({});

  dynamoDBClientMock.on(PutCommand).resolves({});

  expect(await main(event, {} as Context, () => {})).toEqual({
    statusCode: 200,
  });

  const subscription: Subscription = {
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
    expireAt: 14400,
  };

  const subscriptionByConnectionId: SubscriptionByConnectionId = {
    ...subscription,
    pk: "connection#connectionId",
    sk: "subscription#1",
  };

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(PutCommand, {
    Item: subscriptionByConnectionId,
    TableName: tableName,
  });

  const subscriptionByPath: SubscriptionByPath = {
    ...subscription,
    pk: "path#mySubscription",
    sk: "name#userIdAndId#ctx#userId#userId#input#id#id1#connection#connectionId#subscription#1",
  };

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(PutCommand, {
    Item: subscriptionByPath,
    TableName: tableName,
  });

  expect(apigatewayMock).toHaveReceivedCommandWith(PostToConnectionCommand, {
    ConnectionId: "connectionId",
    Data: Buffer.from(
      JSON.stringify({
        id: message.id,
        jsonrpc: message.jsonrpc,
        result: {
          type: "started",
        },
      })
    ),
  });
});

test("when filtering by ctx and input and subscription has stopped it deleted the subscription from dynamodb and posts stopped message", async () => {
  const dynamoDBClient = new DynamoDBClient({});
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);
  const apigatewayMock = mockClient(ApiGatewayManagementApiClient);
  const subscriptions = initSubscriptions();

  const tableName = "tableName";
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
      input: {
        id: true,
      },
      ctx: {
        userId: true,
      },
    })
    .store({ store: dynamodb({ tableName, dynamoDBClient }) })
    .handler({
      createContext: () => ({
        userId: "userId",
      }),
    });

  const message: TRPCClientOutgoingMessage = {
    id: "1",
    method: "subscription.stop",
  };

  const event = {
    body: JSON.stringify(message),
    requestContext: {
      connectionId: "connectionId",
    },
  } as APIGatewayProxyWebsocketEventV2;

  apigatewayMock.on(PostToConnectionCommand).resolves({});

  dynamoDBClientMock.on(QueryCommand).resolves({
    Items: [
      {
        pk: "connection#connectionId",
        sk: "subscription#1",
        type: "subscription",
        path: "mySubscription",
        input: {
          id: "id",
        },
        ctx: {
          userId: "userId",
        },
        id: "1",
      },
    ],
  });

  expect(await main(event, {} as Context, () => {})).toEqual({
    statusCode: 200,
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
    Key: {
      pk: "connection#connectionId",
      sk: "subscription#1",
    },
    TableName: tableName,
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
    Key: {
      pk: "path#mySubscription",
      sk: "name#userIdAndId#ctx#userId#userId#input#id#id#connection#connectionId#subscription#1",
    },
    TableName: tableName,
  });

  expect(apigatewayMock).toHaveReceivedCommandWith(PostToConnectionCommand, {
    ConnectionId: "connectionId",
    Data: Buffer.from(
      JSON.stringify({
        id: message.id,
        jsonrpc: message.jsonrpc,
        result: {
          type: "stopped",
        },
      })
    ),
  });
});

test("when filtering by ctx or input and subscription has started it puts the subscription into dynamodb", async () => {
  const dynamoDBClient = new DynamoDBClient({});
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);
  const apigatewayMock = mockClient(ApiGatewayManagementApiClient);
  const subscriptions = initSubscriptions();

  const tableName = "tableName";
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
    .routes.mySubscription.filter(
      {
        name: "userId",
        ctx: { userId: true },
      },
      {
        name: "id",
        input: { id: true },
      }
    )
    .store({
      store: dynamodb({
        tableName,
        dynamoDBClient,
      }),
    })
    .handler({
      createContext: () => ({ userId: "userId" }),
    });

  const message: TRPCClientOutgoingMessage = {
    id: "1",
    method: "subscription",
    params: {
      path: "mySubscription",
      input: { id: "id1" },
    },
  };

  const event = {
    body: JSON.stringify(message),
    requestContext: {
      connectionId: "connectionId",
    },
  } as APIGatewayProxyWebsocketEventV2;

  apigatewayMock.on(PostToConnectionCommand).resolves({});

  dynamoDBClientMock.on(PutCommand).resolves({});

  expect(await main(event, {} as Context, () => {})).toEqual({
    statusCode: 200,
  });

  const subscription: Subscription = {
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
    expireAt: 14400,
  };

  const subscriptionByConnectionId: SubscriptionByConnectionId = {
    ...subscription,
    pk: "connection#connectionId",
    sk: "subscription#1",
  };

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(PutCommand, {
    Item: subscriptionByConnectionId,
    TableName: tableName,
  });

  const inputSubscriptionByPath: SubscriptionByPath = {
    ...subscription,
    pk: "path#mySubscription",
    sk: "name#id#input#id#id1#connection#connectionId#subscription#1",
  };

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(PutCommand, {
    Item: inputSubscriptionByPath,
    TableName: tableName,
  });

  const ctxSubscriptionByPath = {
    ...subscription,
    pk: "path#mySubscription",
    sk: "name#userId#ctx#userId#userId#connection#connectionId#subscription#1",
  };

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(PutCommand, {
    Item: ctxSubscriptionByPath,
  });

  expect(apigatewayMock).toHaveReceivedCommandWith(PostToConnectionCommand, {
    ConnectionId: "connectionId",
    Data: Buffer.from(
      JSON.stringify({
        id: message.id,
        jsonrpc: message.jsonrpc,
        result: {
          type: "started",
        },
      })
    ),
  });
});

test("when filtering by ctx or input and subscription has stopped it deletes the subscription from dynamodb", async () => {
  const dynamoDBClient = new DynamoDBClient({});
  const dynamoDBClientMock = mockClient(DynamoDBDocumentClient);
  const apigatewayMock = mockClient(ApiGatewayManagementApiClient);
  const subscriptions = initSubscriptions();

  const tableName = "tableName";
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
    .store({ store: dynamodb({ tableName, dynamoDBClient }) })
    .handler({
      createContext: () => ({
        userId: "userId",
      }),
    });

  const message: TRPCClientOutgoingMessage = {
    id: "1",
    method: "subscription.stop",
  };

  const event = {
    body: JSON.stringify(message),
    requestContext: {
      connectionId: "connectionId",
    },
  } as APIGatewayProxyWebsocketEventV2;

  apigatewayMock.on(PostToConnectionCommand).resolves({});

  dynamoDBClientMock.on(QueryCommand).resolves({
    Items: [
      {
        pk: "connection#connectionId",
        sk: "subscription#1",
        type: "subscription",
        path: "mySubscription",
        input: {
          id: "id",
        },
        ctx: {
          userId: "userId",
        },
        id: "1",
      },
    ],
  });

  expect(await main(event, {} as Context, () => {})).toEqual({
    statusCode: 200,
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
    Key: {
      pk: "connection#connectionId",
      sk: "subscription#1",
    },
    TableName: tableName,
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
    Key: {
      pk: "path#mySubscription",
      sk: "name#id#input#id#id#connection#connectionId#subscription#1",
    },
    TableName: tableName,
  });

  expect(dynamoDBClientMock).toHaveReceivedCommandWith(DeleteCommand, {
    Key: {
      pk: "path#mySubscription",
      sk: "name#userId#ctx#userId#userId#connection#connectionId#subscription#1",
    },
  });

  expect(apigatewayMock).toHaveReceivedCommandWith(PostToConnectionCommand, {
    ConnectionId: "connectionId",
    Data: Buffer.from(
      JSON.stringify({
        id: message.id,
        jsonrpc: message.jsonrpc,
        result: {
          type: "stopped",
        },
      })
    ),
  });
});
