import { APIGatewayProxyWebsocketEventV2 } from "aws-lambda";
import { Config } from "../subscriptions/subscriptions";

export interface DeleteConnectionOptions {
  readonly event: APIGatewayProxyWebsocketEventV2;
  readonly config: Config;
}

export type DeleteConnection = (options: DeleteConnectionOptions) => void;

export interface DisconnectStore {
  readonly deleteConnection: DeleteConnection;
}
