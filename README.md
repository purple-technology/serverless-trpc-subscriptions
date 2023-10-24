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
    tableName: "your table goes here",
    dynamoDBClient,
  }),
});
```

```typescript
export const main = appSubscriptions.handler({
  store: dynamodb({
    tableName: "your table goes here",
    dynamoDBClient,
  }),
});
```

Create the pusher

```typescript
export const pusher = appSubscriptions.pusher({
  store: dynamodb({ tableName: "your table goes here", dynamoDBClient }),
  endpoint: "your websocket api endpoint goes here",
});
```

Push to the subscription in your backend processes (lambda etc).

```typescript
await pusher.routes.mySubscription.push({
  data: "hi",
  filter: {
    name: "nameFilter",
    input: {
      name: "name1",
    },
    ctx: {
      userId: "user1",
    },
  },
});
```

This will push a message to client subscribed with input.name name1 and ctx.userId user1
