import { AnyProcedure, AnyRouter, TRPCError } from "@trpc/server";
import { Config } from "../subscriptions/subscriptions";
import { PusherStore } from "./pusher.store";
import {
  ApiGatewayManagementApiClient,
  GoneException,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { isObservable } from "@trpc/server/observable";
import { TRPCResponseMessage } from "@trpc/server/rpc";

export interface PusherOptions {
  readonly config: Config;
  readonly store: PusherStore;
  readonly endpoint: string;
  readonly subscribeTimeout?: number;
}

export interface InternalPushOptions {
  readonly data: unknown;
  readonly filter?: {
    readonly name: string;
    readonly input?: unknown;
    readonly ctx?: unknown;
  };
  readonly path: string;
}

export type Push = (options: InternalPushOptions) => Promise<void>;

export const pusher = (options: PusherOptions): Push => {
  const apigateway = new ApiGatewayManagementApiClient({
    endpoint: options.endpoint,
  });
  const router = options.config._router;
  const transformer = router._def._config.transformer;
  const store = options.store;
  const config = options.config;
  const subscribeTimeout = options.subscribeTimeout ?? 5000;

  return async (options) => {
    const procedure: AnyProcedure = router._def.procedures[options.path];

    if (procedure == null) {
      throw new TRPCError({
        code: "BAD_REQUEST",
      });
    }

    const subscriptions = await store.findSubscriptions({
      ...options,
      config,
    });

    for (const subscription of subscriptions) {
      const result = await procedure({
        rawInput: subscription.input,
        ctx: subscription.ctx,
        path: subscription.path,
        type: "subscription",
      });

      if (!isObservable(result)) {
        throw new TRPCError({
          message: `Subscription ${subscription.path} did not return an observable`,
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      const values = await new Promise<Array<unknown>>((resolve, error) => {
        const values: Array<unknown> = [];

        result.subscribe({
          complete: () => resolve(values),
          next: (value) => values.push(value),
          error: error,
        });

        const subscriber = config._subscribers.get(subscription.path);

        subscriber?.(options.data);

        setTimeout(
          () => error(new Error("Subscription timeout")),
          subscribeTimeout
        );
      });

      for (const value of values) {
        const data = transformer.output.serialize(value);

        const message: TRPCResponseMessage = {
          id: subscription.id,
          jsonrpc: "2.0",
          result: {
            type: "data",
            data,
          },
        };

        try {
          await apigateway.send(
            new PostToConnectionCommand({
              ConnectionId: subscription.connectionId,
              Data: Buffer.from(JSON.stringify(message)),
            })
          );
        } catch (error) {
          if (error instanceof GoneException) {
            console.warn(error);
            await store.deleteConnection({
              connectionId: subscription.connectionId,
              config,
            });
          }
        }
      }
    }
  };
};
