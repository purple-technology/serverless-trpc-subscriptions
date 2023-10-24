import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ConnectionByConnectionId } from "../dynamodb/table";
import { ConnectStore } from "./connect.store";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { getExpireAt } from "../dynamodb/getExpireAt";

export interface DynamoDbOptions {
  readonly tableName: string;
  readonly dynamoDBClient: DynamoDBClient;
}

export type DynamoDb = (options: DynamoDbOptions) => ConnectStore;

export const dynamodb: DynamoDb = (options) => {
  const dynamoDBClient = DynamoDBDocumentClient.from(options.dynamoDBClient, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });

  return async (event) => {
    const item: ConnectionByConnectionId = {
      pk: `connection#${event.requestContext.connectionId}`,
      sk: `connection#${event.requestContext.connectionId}`,
      type: "connection",
      expireAt: getExpireAt(),
    };

    await dynamoDBClient.send(
      new PutCommand({
        TableName: options.tableName,
        Item: item,
      })
    );
  };
};
