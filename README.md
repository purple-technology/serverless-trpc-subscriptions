# Motivation

Subscriptions and real time data is a common requirement for apps. At purple we love the type-safety provided by tRPC and we also love serverless. tRPC currently requires a stateful server while serverless is of course stateless. Here we're providing the following solutions:

- Provide adapters for AWS API Gateway to easily create $connect, $disconnect and a main handler in a type-safe manner
- Provide logic to persist subscriptions in DynamoDB using single table design
- To push to a subscription in backend processes with type safety
- To filter subscriptions and only push to a subscription based on ctx or input

# Show me an example!

Initialise subscriptions and define your tRPC router

```typescript
export const subscriptions = initSubscriptions();

interface AppContext {
  readonly userId: string;
}

const t = initTRPC.context<AppContext>().create();

export const appRouter = t.router({
  mySubscription: t.procedure
    .input(
      z.object({
        name: z.string(),
      })
    )
    .subscription(subscriptions.resolver<string>()),
});
```

Define filters based on the routes

```typescript
export const appSubscriptions = subscriptions
  .router({ router: appRouter })
  .routes.mySubscription.filter({
    name: "userIdAndName",
    ctx: {
      userId: true,
    },
    input: {
      name: true,
    },
  });
```

Create the adaptors ($connect, handler, $disconnect)

```typescript
export const main = appSubscriptions.connect({
  store: dynamodb({
    dynamoDBClient,
    tableName: "your table name goes here",
  }),
});
```

```typescript
export const main = appSubscriptions.disconnect({
  store: dynamodb({
    tableName: "your table name goes here",
    dynamoDBClient,
  }),
});
```

```typescript
export const main = appSubscriptions.handler({
  store: dynamodb({
    tableName: "your table name goes here",
    dynamoDBClient,
  }),
});
```

Create the pusher

```typescript
export const pusher = appSubscriptions.pusher({
  store: dynamodb({ tableName: "your table name goes here", dynamoDBClient }),
  endpoint: "your websocket api endpoint goes here",
});
```

Push to the subscription in your backend processes (lambda etc).

```typescript
await pusher.routes.mySubscription.push({
  data: "hi",
  filter: {
    name: "userIdAndName",
    input: {
      name: "name1",
    },
    ctx: {
      userId: "user1",
    },
  },
});
```

Subscribe on the client like any other tRPC subscription

```typescript
api.mySubscription.useSubscription(
  {
    name: "hello",
  },
  {
    onData: (data) => {
      // handle on data
    },
  }
);
```

# Usage with SST

We recommend SST to deploy serverless applications to AWS. It provdes a WebSocketApi construct to deploy to Api Gateway

First use the Table construct. A dynamodb table is required to persist connections and subscriptions.

```typescript
const table = new Table(stack, "Subscriptions", {
  primaryIndex: {
    partitionKey: "pk",
    sortKey: "sk",
  },
  fields: {
    pk: "string",
    sk: "string",
  },
  cdk: {
    table: {
      removalPolicy: RemovalPolicy.DESTROY,
    },
  },
  timeToLiveAttribute: "expireAt",
});
```

Fields pk and sk are required fields to be the partition key and sort key respectively. A expireAt field is used to delete connection and subscriptions which are older than 4 hours

Then define your web socket api construct

```typescript
const websocket = new WebSocketApi(stack, "WebsocketApi", {
  defaults: {
    function: {
      bind: [table],
    },
  },
  routes: {
    $connect: "./packages/functions/src/api/websocket/connect.main",
    $default: "./packages/functions/src/api/websocket/handler.main",
    $disconnect: "./packages/functions/src/api/websocket/disconnect.main",
  },
});

You should bind the subscription table to the web socket api so it can be used to connect, disconnect and handle subscriptions. $connect, $diconnect, $default reference lambdas which are created from the adaptors

```

Now you just need to use the SST `sst/node` to connect it the adaptors to your infrastructure

```typescript
//packages/functions/src/api/websocket/connect
export const main = appSubscriptions.connect({
  store: dynamodb({
    dynamoDBClient,
    tableName: Table.Subscriptions.tableName,
  }),
});
```

```typescript
//packages/functions/src/api/websocket/disconnect
export const main = appSubscriptions.disconnect({
  store: dynamodb({
    tableName: Table.Subscriptions.tableName,
    dynamoDBClient,
  }),
});
```

```typescript
//packages/functions/src/api/websocket/handler
export const main = appSubscriptions.handler({
  store: dynamodb({
    tableName: Table.Subscriptions.tableName,
    dynamoDBClient,
  }),
});
```
