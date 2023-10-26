import { DeleteConnectionOptions } from "../dynamodb/deleteConnection";
import { Subscription } from "../dynamodb/table";
import { Config } from "../subscriptions/subscriptions";

export interface FindSubscriptionsOptions {
  readonly config: Config;
  readonly data: unknown;
  readonly filter?: {
    readonly name: string;
    readonly input?: unknown;
    readonly ctx?: unknown;
  };
  readonly path: string;
}

export type FindSubscriptions = (
  options: FindSubscriptionsOptions
) => Promise<Array<Subscription>>;

export type DeleteConnection = (
  options: Omit<DeleteConnectionOptions, "dynamoDBClient" | "tableName">
) => Promise<void>;

export interface PublisherStore {
  readonly findSubscriptions: FindSubscriptions;
  readonly deleteConnection: DeleteConnection;
}
