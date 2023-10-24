import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DisconnectStore } from "./disconnect.store";
import { deleteConnection } from "../dynamodb/deleteConnection";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export interface DynamoDbOptions {
  readonly tableName: string;
  readonly dynamoDBClient: DynamoDBClient;
}

export type DynamoDb = (options: DynamoDbOptions) => DisconnectStore;

export const dynamodb: DynamoDb = (options) => {
  const dynamoDBClient = DynamoDBDocumentClient.from(options.dynamoDBClient, {
    marshallOptions: { removeUndefinedValues: true },
  });
  const tableName = options.tableName;
  return {
    deleteConnection: async (options) => {
      const config = options.config;
      await deleteConnection({
        connectionId: options.event.requestContext.connectionId,
        dynamoDBClient,
        tableName,
        config,
      });
    },
  };
};
