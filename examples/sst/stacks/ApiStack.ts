import {
  Api,
  EventBus,
  StackContext,
  Table,
  WebSocketApi,
  Function,
} from "sst/constructs";
import { RemovalPolicy } from "aws-cdk-lib";

export interface ApiStackResult {
  readonly http: Api;
  readonly websocket: WebSocketApi;
}

export const ApiStack = ({ stack }: StackContext): ApiStackResult => {
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

  const eventBus = new EventBus(stack, "EventBus");

  const apiFunction = new Function(stack, "ApiFunction", {
    handler: "./packages/functions/src/api/http.main",
    bind: [table, eventBus],
  });

  const http = new Api(stack, "Api", {
    routes: {
      "GET /api/{proxy+}": apiFunction,
      "POST /api/{proxy+}": apiFunction,
    },
  });

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

  eventBus.subscribe("issue.create", {
    handler: "./packages/functions/src/events/issueCreated.main",
    bind: [websocket, table],
  });

  return {
    http,
    websocket,
  };
};
