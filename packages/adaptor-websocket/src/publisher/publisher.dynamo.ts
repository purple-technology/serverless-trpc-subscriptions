import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { PublisherStore } from "./publisher.store";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { Subscription } from "../dynamodb/table";
import { deleteConnection } from "../dynamodb/deleteConnection";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export interface DynamoDBOptions {
  readonly tableName: string;
  readonly dynamoDBClient: DynamoDBClient;
}

export const dynamodb = (options: DynamoDBOptions): PublisherStore => {
  const dynamoDBClient = DynamoDBDocumentClient.from(options.dynamoDBClient, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });
  const tableName = options.tableName;

  return {
    findSubscriptions: async (options) => {
      const buildInputSK = () => {
        if (options.filter?.input == null) return [];
        return ["input"].concat(
          Object.entries(options.filter.input).map(
            ([key, value]) => `${key}#${value}`
          )
        );
      };

      const buildCtxSK = () => {
        if (options.filter?.ctx == null) return [];
        return ["ctx"].concat(
          Object.entries(options.filter.ctx).map(
            ([key, value]) => `${key}#${value}`
          )
        );
      };

      const buildSK = () => {
        if (options.filter == null) return "";

        const ctx = buildCtxSK();
        const input = buildInputSK();

        const inputAndCtx = ["name", options.filter.name].concat(
          ctx.concat(input)
        );

        if (inputAndCtx.length > 0) return inputAndCtx.join("#");

        return "";
      };

      const pk = `path#${options.path}`;
      const sk = buildSK();

      const response = await dynamoDBClient.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "pk = :pk and begins_with(sk, :sk)",
          ExpressionAttributeValues: {
            ":pk": pk,
            ":sk": sk,
          },
        })
      );

      const subscriptions = (response.Items ?? []) as Array<Subscription>;

      return subscriptions;
    },
    deleteConnection: async (options) => {
      await deleteConnection({
        ...options,
        tableName,
        dynamoDBClient,
      });
    },
  };
};
