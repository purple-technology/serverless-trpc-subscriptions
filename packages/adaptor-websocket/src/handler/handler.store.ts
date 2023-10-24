import { AnyRouter, inferRouterContext } from "@trpc/server";
import {
  TRPCClientOutgoingMessage,
  TRPCRequestMessage,
} from "@trpc/server/rpc";
import { APIGatewayProxyWebsocketEventV2 } from "aws-lambda";
import { Config } from "../subscriptions/subscriptions";

export interface CreateSubscriptionOptions {
  readonly event: APIGatewayProxyWebsocketEventV2;
  readonly message: TRPCRequestMessage;
  readonly ctx: unknown;
  readonly config: Config;
}

export interface DeleteSubscriptionOptions {
  readonly event: APIGatewayProxyWebsocketEventV2;
  readonly message: TRPCClientOutgoingMessage;
  readonly config: Config;
}

export interface DeleteConnectionOptions {
  readonly event: APIGatewayProxyWebsocketEventV2;
  readonly message: TRPCClientOutgoingMessage;
  readonly config: Config;
}

export interface HandlerStore {
  readonly createSubscription: (
    options: CreateSubscriptionOptions
  ) => Promise<void>;
  readonly deleteSubscription: (
    options: DeleteSubscriptionOptions
  ) => Promise<void>;
  readonly deleteConnection: (
    options: DeleteConnectionOptions
  ) => Promise<void>;
}
