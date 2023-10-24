import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import {
  AnyProcedure,
  AnyRouter,
  TRPCError,
  inferRouterContext,
} from "@trpc/server";
import {
  ApiGatewayManagementApiClient,
  GoneException,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { parseMessage } from "@trpc/server/adapters/ws";
import { isObservable } from "@trpc/server/observable";
import { HandlerStore } from "./handler.store";
import { TRPCResponseMessage } from "@trpc/server/rpc";
import { Buffer } from "buffer";
import { Config } from "../subscriptions/subscriptions";

type CreateContext<TRouter extends AnyRouter> = (
  ...params: Parameters<APIGatewayProxyWebsocketHandlerV2>
) => inferRouterContext<TRouter>;

export interface HandlerOptions<TRouter extends AnyRouter> {
  readonly createContext?: CreateContext<TRouter>;
  readonly store: HandlerStore;
  readonly config: Config<TRouter>;
}

export type Handler = <TRouter extends AnyRouter>(
  options: HandlerOptions<TRouter>
) => APIGatewayProxyWebsocketHandlerV2;

export const handler: Handler = (options) => {
  const config = options.config;

  return async (...params) => {
    const [event] = params;
    if (event.body == null) {
      throw new TRPCError({
        code: "BAD_REQUEST",
      });
    }

    const apigateway = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
    });

    const transformer = options.config._router._def._config.transformer;
    const rawMessage = JSON.parse(event.body);
    const rawMessages = Array.isArray(rawMessage) ? rawMessage : [rawMessage];

    let context: ReturnType<NonNullable<typeof options.createContext>> | null =
      null;

    const getContext = async () => {
      if (context == null) {
        context = await options?.createContext?.(...params);
      }
      return context;
    };

    await Promise.all(
      rawMessages.map(async (rawMessage) => {
        const message = parseMessage(rawMessage, transformer);

        if (message.id == null) {
          throw new TRPCError({
            code: "BAD_REQUEST",
          });
        }

        if (message.method === "subscription") {
          const ctx = await getContext();
          const procedure: AnyProcedure =
            options.config._router._def.procedures[message.params.path];

          const result = await procedure({
            rawInput: message.params.input,
            path: message.params.path,
            type: "subscription",
            ctx,
          });

          if (!isObservable(result)) {
            throw new TRPCError({
              message: `Subscription ${message.params.path} did not return an observable`,
              code: "INTERNAL_SERVER_ERROR",
            });
          }

          await options.store.createSubscription({
            event,
            message,
            ctx,
            config,
          });

          const response: TRPCResponseMessage = {
            id: message.id,
            jsonrpc: message.jsonrpc,
            result: {
              type: "started",
            },
          };

          try {
            await apigateway.send(
              new PostToConnectionCommand({
                ConnectionId: event.requestContext.connectionId,
                Data: Buffer.from(JSON.stringify(response)),
              })
            );
          } catch (e) {
            if (e instanceof GoneException) {
              await options.store.deleteConnection({ event, message, config });
            }
          }
        }

        if (message.method === "subscription.stop") {
          await options.store.deleteSubscription({
            event,
            message,
            config,
          });

          const response: TRPCResponseMessage = {
            id: message.id,
            jsonrpc: message.jsonrpc,
            result: {
              type: "stopped",
            },
          };

          try {
            await apigateway.send(
              new PostToConnectionCommand({
                ConnectionId: event.requestContext.connectionId,
                Data: Buffer.from(JSON.stringify(response)),
              })
            );
          } catch (e) {
            if (e instanceof GoneException) {
              await options.store.deleteConnection({ event, message, config });
            }
          }
        }
      })
    );

    return {
      statusCode: 200,
    };
  };
};
