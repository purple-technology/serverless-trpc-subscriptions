import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { DisconnectStore } from "./disconnect.store";
import { Config } from "../subscriptions/subscriptions";

export interface DisconnectOptions {
  readonly store: DisconnectStore;
  readonly config: Config;
}

export type Disconnect = (
  options: DisconnectOptions
) => APIGatewayProxyWebsocketHandlerV2;

export const disconnect: Disconnect = (options) => {
  return async (event) => {
    await options.store.deleteConnection({
      event,
      config: options.config,
    });
    return { statusCode: 200 };
  };
};
