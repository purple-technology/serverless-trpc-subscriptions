import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ConnectStore } from "../connect/connect.store";
import { dynamodb as connectDynamoDb } from "../connect/connect.dynamodb";
import { dynamodb as disconnectDynamoDb } from "../disconnect/disconnect.dynamodb";
import { dynamodb as handlerDynamoDb } from "../handler/handler.dynamo";
import { dynamodb as publisherDynamoDb } from "../publisher/publisher.dynamo";
import { DisconnectStore } from "../disconnect/disconnect.store";
import { HandlerStore } from "../handler/handler.store";
import { PublisherStore } from "../publisher/publisher.store";

export interface DynamoDbOptions {
  readonly tableName: string;
  readonly dynamoDBClient: DynamoDBClient;
}

export interface DynamoDbResult {
  readonly connect: ConnectStore;
  readonly disconnect: DisconnectStore;
  readonly handler: HandlerStore;
  readonly publisher: PublisherStore;
}

export const dynamodb = (options: DynamoDbOptions): DynamoDbResult => {
  return {
    connect: connectDynamoDb(options),
    disconnect: disconnectDynamoDb(options),
    handler: handlerDynamoDb(options),
    publisher: publisherDynamoDb(options),
  };
};
