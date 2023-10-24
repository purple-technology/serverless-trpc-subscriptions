import {
  DeleteCommand,
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { ConnectionByConnectionId, SubscriptionByConnectionId } from "./table";
import { Config } from "../subscriptions/subscriptions";
import { buildSK } from "./buildSk";

export interface DeleteConnectionOptions {
  readonly connectionId: string;
  readonly dynamoDBClient: DynamoDBDocumentClient;
  readonly tableName: string;
  readonly config: Config;
}

export const deleteConnection = async (options: DeleteConnectionOptions) => {
  const { tableName, config } = options;

  const dynamoDBClient = options.dynamoDBClient;

  const result = await dynamoDBClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": `connection#${options.connectionId}`,
      },
    })
  );

  const items = result.Items ?? [];

  const connectionsOrSubscriptions = items as Array<
    ConnectionByConnectionId | SubscriptionByConnectionId
  >;

  for (const connectionOrSubscription of connectionsOrSubscriptions) {
    if (connectionOrSubscription.type === "connection") {
      await dynamoDBClient.send(
        new DeleteCommand({
          TableName: tableName,
          Key: {
            pk: connectionOrSubscription.pk,
            sk: connectionOrSubscription.sk,
          },
        })
      );
    } else {
      await dynamoDBClient.send(
        new DeleteCommand({
          TableName: tableName,
          Key: {
            pk: `connection#${options.connectionId}`,
            sk: `subscription#${connectionOrSubscription.id}`,
          },
        })
      );

      const filterForSubscription =
        config._filters[connectionOrSubscription.path] ?? [];

      if (filterForSubscription.length < 1) {
        dynamoDBClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: {
              pk: `path#${connectionOrSubscription.path}`,
              sk: `connection#${connectionOrSubscription.connectionId}#subscription#${connectionOrSubscription.id}`,
            },
          })
        );
      }

      for (const filter of filterForSubscription) {
        const sk = buildSK({
          input: connectionOrSubscription.input,
          ctx: connectionOrSubscription.ctx,
          filter,
          path: connectionOrSubscription.path,
          suffix: `connection#${connectionOrSubscription.connectionId}#subscription#${connectionOrSubscription.id}`,
        });

        await dynamoDBClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: {
              pk: `path#${connectionOrSubscription.path}`,
              sk,
            },
          })
        );
      }
    }
  }
};
