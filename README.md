# Motivation

Subscriptions and real time data is a common requirement for apps. At purple we love the type-safety provided by tRPC and we also love serverless. tRPC currently requires a stateful server for websockets while serverless is of course stateless. Here we're providing the following solutions:

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
```

You should bind the subscription table to the web socket api so it can be used to connect, disconnect and handle subscriptions. $connect, $diconnect, $default reference lambdas which are created from the adaptors

Now you just need to use the SST's `sst/node` to connect the adaptors to your infrastructure

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

To push to a subscription in a lambda function you need to first use the function construct and bind it to the websocket and table. For example you could push a message to the subscription in the consumer of an event bus

```typescript
const eventBus = new EventBus(stack, "EventBus");

eventBus.subscribe("myEvent", {
  handler: "./packages/functions/src/events/myEvent.main",
  bind: [websocket, table],
});
```

You can then wire up the pusher to the web socket api and table

```typescript
export const pusher = appSubscriptions.pusher({
  store: dynamodb({ tableName: Table.Subscriptions.tableName, dynamoDBClient }),
  endpoint: WebSocketApi.WebsocketApi.httpsUrl,
});
```

And then you can push the message in the event bus consumer

```typescript
export const main = EventHandler(Events.MyEvent, async (event) => {
  await pusher.routes.mySubscription.push({
    data: "hi",
    filter: {
      name: "userIdAndName",
      input: {
        name: "Bob",
      },
      ctx: {
        userId: "user1",
      },
    },
  });
});
```

And of course you can use environment variables in NextJS to connect to the web socket api so the client can subscribe

```typescript
new NextjsSite(context.stack, "Web", {
  path: "./packages/web",
  environment: {
    NEXT_PUBLIC_HTTP_URL: http.url,
    NEXT_PUBLIC_WS_URL: websocket.url,
  },
});
```

And make your own provider to wire it up to the frontend. Notice we can support http or ws depending on if it is a subscription or not

```typescript
const wsClient = createWSClient({
  url: process.env.NEXT_PUBLIC_WS_URL ?? "",
});

export const Providers: React.FunctionComponent<ProviderProps> = ({
  children,
}) => {
  const [queryClient] = React.useState(() => new QueryClient());
  const [trpcClient] = React.useState(() =>
    api.createClient({
      links: [
        splitLink({
          condition: (op) => op.type === "subscription",
          true: wsLink({
            client: wsClient,
          }),
          false: httpBatchLink({
            url: `${process.env.NEXT_PUBLIC_HTTP_URL}/api` ?? "",
          }),
        }),
      ],
    })
  );
  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </api.Provider>
  );
};
```

Lets recap. This approach allows us to continue using AWS infrastructure and serverless. We can push notifications in any lambda we deploy to AWS while keeping type safety. We can filter subscriptions based on defined filters on anything in input or ctx of the trpc subscription
