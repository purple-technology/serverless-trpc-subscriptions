import {
  Cron,
  Function,
  StackContext,
  Table,
  WebSocketApi,
} from "sst/constructs";

export const ApiStack = (context: StackContext) => {
  const table = new Table(context.stack, "Subscriptions", {
    fields: {
      pk: "string",
      sk: "string",
    },
    primaryIndex: {
      partitionKey: "pk",
      sortKey: "sk",
    },
    timeToLiveAttribute: "expireAt",
  });

  const websocket = new WebSocketApi(context.stack, "WebSocketApi", {
    routes: {
      $connect: "./packages/functions/src/api/websocket/connect.main",
      $disconnect: "./packages/functions/src/api/websocket/disconnect.main",
      $default: "./packages/functions/src/api/websocket/handler.main",
    },
    defaults: {
      function: {
        bind: [table],
      },
    },
  });

  new Cron(context.stack, "PingCron", {
    schedule: "rate(1 minute)",
    job: new Function(context.stack, "PingFunction", {
      handler: "./packages/functions/src/events/ping.main",
      bind: [websocket, table],
    }),
  });

  return { websocket };
};
