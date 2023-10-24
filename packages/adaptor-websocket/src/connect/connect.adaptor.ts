import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { ConnectStore } from "./connect.store";

export interface ConnectOptions {
  readonly store: ConnectStore;
}

export type Connect = (
  options: ConnectOptions
) => APIGatewayProxyWebsocketHandlerV2;

export const connect: Connect = (options: ConnectOptions) => {
  return async (event) => {
    await options.store(event);

    return {
      statusCode: 200,
    };
  };
};
