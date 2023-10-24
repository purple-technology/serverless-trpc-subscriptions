import { APIGatewayProxyWebsocketEventV2 } from "aws-lambda";

export type ConnectStore = (
  event: APIGatewayProxyWebsocketEventV2
) => Promise<void>;
