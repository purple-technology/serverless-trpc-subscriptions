export interface ConnectionByConnectionId {
  readonly pk: `connection#${string}`;
  readonly sk: `connection#${string}`;
  readonly type: "connection";
  readonly expireAt: number;
}

export interface Subscription {
  readonly type: "subscription";
  readonly path: string;
  readonly input: unknown;
  readonly ctx: unknown;
  readonly id: string;
  readonly connectionId: string;
  readonly expireAt: number;
}

export interface SubscriptionByConnectionId extends Subscription {
  readonly pk: `connection#${string}`;
  readonly sk: `subscription#${string}`;
}

export interface SubscriptionByPath extends Subscription {
  readonly pk: `path#${string}`;
  readonly sk:
    | `connection#${string}#subscription#${string}`
    | `name#${string}#ctx#${string}#connection#${string}#subscription#${string}`
    | `name#${string}#input#${string}#connection#${string}#subscription#${string}`
    | `name#${string}ctx#${string}#input${string}#connection${string}#subscription#${string}`;
}
