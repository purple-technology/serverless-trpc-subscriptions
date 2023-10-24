import { HandlerStore } from "./handler.store";
import {
  DeleteCommand,
  PutCommand,
  QueryCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import {
  Subscription,
  SubscriptionByConnectionId,
  SubscriptionByPath,
} from "../dynamodb/table";
import { deleteConnection } from "../dynamodb/deleteConnection";
import { buildSK } from "../dynamodb/buildSk";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { getExpireAt } from "../dynamodb/getExpireAt";

export interface DynamoDbOptions {
  readonly tableName: string;
  readonly dynamoDBClient: DynamoDBClient;
}

export const dynamodb = (options: DynamoDbOptions): HandlerStore => {
  const dynamoDBClient = DynamoDBDocumentClient.from(options.dynamoDBClient, {
    marshallOptions: { removeUndefinedValues: true },
  });
  const tableName = options.tableName;

  return {
    createSubscription: async (options) => {
      const config = options.config;

      if (options.message.id == null) return;

      const connectionId = options.event.requestContext.connectionId;

      const subscriptionByConnectionId: SubscriptionByConnectionId = {
        pk: `connection#${connectionId}`,
        sk: `subscription#${options.message.id}`,
        type: "subscription",
        ctx: options.ctx,
        input: options.message.params.input,
        path: options.message.params.path,
        id: options.message.id.toString(),
        connectionId,
        expireAt: getExpireAt(),
      };

      await dynamoDBClient.send(
        new PutCommand({
          TableName: tableName,
          Item: subscriptionByConnectionId,
        })
      );

      const input = options.message.params.input;
      const ctx = options.ctx;

      const subscription: Subscription = {
        type: "subscription",
        ctx: ctx,
        input,
        id: options.message.id.toString(),
        path: options.message.params.path,
        connectionId,
        expireAt: getExpireAt(),
      };

      const filtersForPath = config._filters[subscription.path] ?? [];

      if (filtersForPath.length < 1) {
        const subscriptionByPath: SubscriptionByPath = {
          ...subscription,
          pk: `path#${subscription.path}`,
          sk: `connection#${connectionId}#subscription#${subscription.id}`,
        };

        await dynamoDBClient.send(
          new PutCommand({
            TableName: tableName,
            Item: subscriptionByPath,
          })
        );

        return;
      }

      await Promise.all(
        filtersForPath.map(async (filter) => {
          const sk = buildSK({
            input,
            ctx,
            path: subscription.path,
            filter,
            suffix: `connection#${connectionId}#subscription#${subscription.id}`,
          });

          const subscriptionByPath: SubscriptionByPath = {
            ...subscription,
            pk: `path#${subscription.path}`,
            sk: sk as SubscriptionByPath["sk"],
          };

          await dynamoDBClient.send(
            new PutCommand({
              TableName: tableName,
              Item: subscriptionByPath,
            })
          );
        })
      );
    },
    deleteSubscription: async (options) => {
      const connectionId = options.event.requestContext.connectionId;
      const config = options.config;
      const filters = config._filters;

      const result = await dynamoDBClient.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "pk = :pk and sk = :sk",
          ExpressionAttributeValues: {
            ":pk": `connection#${connectionId}`,
            ":sk": `subscription#${options.message.id}`,
          },
        })
      );

      const items = result.Items ?? [];

      const subscriptions = items as Array<SubscriptionByConnectionId>;

      await Promise.all(
        subscriptions.map(async (subscription) => {
          await dynamoDBClient.send(
            new DeleteCommand({
              TableName: tableName,
              Key: {
                pk: subscription.pk,
                sk: subscription.sk,
              },
            })
          );

          const filtersForSubscription = filters[subscription.path] ?? [];

          if (filtersForSubscription.length < 1) {
            await dynamoDBClient.send(
              new DeleteCommand({
                TableName: tableName,
                Key: {
                  pk: `path#${subscription.path}`,
                  sk: `connection#${connectionId}#subscription#${subscription.id}`,
                },
              })
            );
            return;
          }

          await Promise.all(
            filtersForSubscription.map(async (filter) => {
              const sk = buildSK({
                input: subscription.input,
                ctx: subscription.ctx,
                filter,
                path: subscription.path,
                suffix: `connection#${connectionId}#subscription#${subscription.id}`,
              });

              await dynamoDBClient.send(
                new DeleteCommand({
                  TableName: tableName,
                  Key: {
                    pk: `path#${subscription.path}`,
                    sk,
                  },
                })
              );

              await dynamoDBClient.send(
                new DeleteCommand({
                  TableName: tableName,
                  Key: {
                    pk: `connection#${options.event.requestContext.connectionId}`,
                    sk: `subscription#${subscription.id}`,
                  },
                })
              );
            })
          );
        })
      );
    },
    deleteConnection: async (options) => {
      const config = options.config;
      await deleteConnection({
        connectionId: options.event.requestContext.connectionId,
        config,
        dynamoDBClient,
        tableName,
      });
    },
  };
};
