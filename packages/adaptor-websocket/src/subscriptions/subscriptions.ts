import {
  AnyProcedure,
  AnyRouter,
  AnySubscriptionProcedure,
  ProcedureRecord,
  inferProcedureInput,
  inferRouterContext,
} from "@trpc/server";
import { Observable, observable } from "@trpc/server/observable";
import { inferTransformedSubscriptionOutput } from "@trpc/server/shared";
import { Connect, ConnectOptions, connect } from "../connect/connect.adaptor";
import {
  Disconnect,
  DisconnectOptions,
  disconnect,
} from "../disconnect/disconnect.adaptor";
import { Handler, HandlerOptions, handler } from "../handler/handler.adaptor";
import { PublisherOptions, publisher } from "../publisher/publisher.adaptor";

type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

type PublishOptionsWithFilter<T, TFilters> = {
  [TKey in keyof TFilters as TFilters[TKey] extends false
    ? never
    : TKey]: T[TKey & keyof T];
};

type InferPublishOptions<
  TInput,
  TContext,
  TFilterOption extends FilterOption<unknown, unknown>
> = TFilterOption extends FilterOption<unknown, unknown>
  ? {
      readonly [TKey in keyof TFilterOption]: TKey extends "ctx"
        ? PublishOptionsWithFilter<TContext, TFilterOption[TKey]>
        : TKey extends "input"
        ? PublishOptionsWithFilter<TInput, TFilterOption[TKey]>
        : TKey extends "name"
        ? TFilterOption[TKey]
        : never;
    }
  : never;

interface PublishOptions<
  TProcedure extends AnySubscriptionProcedure,
  TInput,
  TContext,
  TFilterOption extends FilterOption<unknown, unknown>,
  TData = inferTransformedSubscriptionOutput<TProcedure>
> {
  readonly filter?: InferPublishOptions<TInput, TContext, TFilterOption>;
  readonly data: TData;
}
export type AnyPublishOptions = PublishOptions<
  AnySubscriptionProcedure,
  unknown,
  unknown,
  FilterOption<unknown, unknown>
>;

export interface FilterOption<TInput, TContext> {
  readonly name: string;
  readonly input?: Record<keyof Partial<TInput>, boolean> | undefined;
  readonly ctx?: Record<keyof Partial<TContext>, boolean> | undefined;
}

export type AnyFilterOption = FilterOption<unknown, unknown>;

type FilterOptions<TInput, TContext> = ReadonlyArray<
  FilterOption<TInput, TContext>
>;

type Filters = Record<string, FilterOptions<unknown, unknown>>;

type ProcedureSubscription<
  TRouter extends AnyRouter,
  TProcedure extends AnySubscriptionProcedure,
  TPath extends string,
  TContext,
  TFilters extends Filters,
  TCanPublish extends boolean,
  TInput = inferProcedureInput<TProcedure>
> = OmitNever<{
  readonly filter: <
    const TFilterOptions extends FilterOptions<TInput, TContext>
  >(
    ...options: TFilterOptions
  ) => RouterSubscriptions<
    TRouter,
    TContext,
    TFilters & { [TKey in TPath]: TFilterOptions }
  >;
  readonly publish: TCanPublish extends false
    ? never
    : (
        options: PublishOptions<
          TProcedure,
          TInput,
          TContext,
          TFilters[TPath & keyof TFilters][number]
        >
      ) => Promise<void>;
}>;

type DecorateProcedureWithSubscriptions<
  TRouter extends AnyRouter,
  TProcedure extends AnyProcedure | AnyRouter,
  TPath extends string,
  TContext,
  TFilters extends Filters,
  TCanPublish extends boolean
> = TProcedure extends AnyRouter
  ? DecorateProcedureRecordWithSubscriptions<
      TRouter,
      TProcedure["_def"]["record"],
      TPath,
      TContext,
      TFilters,
      TCanPublish
    >
  : TProcedure extends AnySubscriptionProcedure
  ? ProcedureSubscription<
      TRouter,
      TProcedure,
      TPath,
      TContext,
      TFilters,
      TCanPublish
    >
  : never;

type DecorateProcedureRecordWithSubscriptions<
  TRouter extends AnyRouter,
  TProcedures extends ProcedureRecord,
  TPath extends string,
  TContext,
  TFilters extends Filters,
  TCanPublish extends boolean
> = {
  [TKey in keyof TProcedures]: DecorateProcedureWithSubscriptions<
    TRouter,
    TProcedures[TKey],
    `${TPath}${TKey & string}`,
    TContext,
    TFilters,
    TCanPublish
  >;
};

export interface RouterSubscriptions<
  TRouter extends AnyRouter,
  TContext = inferRouterContext<TRouter>,
  TFilters extends Filters = {},
  TCanPublish extends boolean = false
> {
  routes: DecorateProcedureRecordWithSubscriptions<
    TRouter,
    TRouter["_def"]["record"],
    "",
    TContext,
    TFilters,
    TCanPublish
  >;
  connect: Connect;
  disconnect: (
    options: Omit<DisconnectOptions, "config">
  ) => ReturnType<Disconnect>;
  handler: (
    options: Omit<HandlerOptions<TRouter>, "config">
  ) => ReturnType<Handler>;
  publisher: (
    options: Omit<PublisherOptions, "config">
  ) => RouterSubscriptions<TRouter, TContext, TFilters, true>;
}

export interface Config<TRouter extends AnyRouter = AnyRouter> {
  readonly _router: TRouter;
  readonly _filters: Filters;
  readonly _subscribers: Map<string, (data: unknown) => void>;
  readonly _publisher: Omit<PublisherOptions, "config"> | null;
}

interface ProxyCallbackOptions<TTarget extends object> {
  target: TTarget;
  path: string[];
  args: unknown[];
}

type ProxyCallback<TTarget extends object> = (
  opts: ProxyCallbackOptions<TTarget>
) => unknown;

const createRecursiveProxy = <TTarget extends object>(
  callback: ProxyCallback<TTarget>,
  path: string[],
  target: TTarget
) => {
  const proxy: unknown = new Proxy(() => {}, {
    get(_obj, key) {
      if (typeof key !== "string") return undefined;
      return createRecursiveProxy(callback, [...path, key], target);
    },
    apply(_1, _2, args) {
      return callback({
        target,
        path,
        args,
      });
    },
  });

  return proxy;
};

export interface RouterSubscriptionsOptions<TRouter extends AnyRouter> {
  readonly router: TRouter;
}

export interface SubscriptionsResult {
  readonly resolver: <T>() => (options: object) => Observable<T, unknown>;
  readonly router: <TRouter extends AnyRouter>(
    options: RouterSubscriptionsOptions<TRouter>
  ) => RouterSubscriptions<TRouter>;
}

export const initSubscriptions = (): SubscriptionsResult => {
  const subscribers = new Map<string, (data: unknown) => void>();

  return {
    resolver:
      <T>() =>
      (options: object) => {
        if (!("path" in options) || typeof options.path !== "string") {
          throw new Error("path is not in options");
        }

        const path = options.path;

        return observable<T>((observer) => {
          subscribers.set(path, (data) => {
            observer.next(data as T);
            observer.complete();
          });
        });
      },
    router: <TRouter extends AnyRouter>(
      options: RouterSubscriptionsOptions<TRouter>
    ) => {
      const callback: ProxyCallback<Config> = (options) => {
        const config = options.target;

        const method = options.path.pop();

        const path = options.path.slice(1).join(".");

        switch (method) {
          case "filter": {
            const filterOptions = options.args as FilterOptions<
              unknown,
              unknown
            >;

            return createRecursiveProxy(callback, [], {
              ...options.target,
              _filters: {
                ...options.target._filters,
                [path]: filterOptions,
              },
            });
          }
          case "publisher": {
            const firstArg = options.args[0];

            return createRecursiveProxy(callback, [], {
              ...options.target,
              _publisher: firstArg as Omit<PublisherOptions, "config">,
            });
          }
          case "publish": {
            if (options.target._publisher == null) return;

            const publish = publisher({
              ...options.target._publisher,
              config: options.target,
            });

            const firstArg = options.args[0] as AnyPublishOptions;

            return publish({
              ...firstArg,
              path,
            });
          }
          case "connect": {
            return connect(options.args[0] as ConnectOptions);
          }
          case "disconnect": {
            return disconnect({
              ...(options.args[0] as DisconnectOptions),
              config: config as unknown as Config,
            });
          }
          case "handler": {
            return handler({
              ...(options.args[0] as HandlerOptions<TRouter>),
              config: config as unknown as Config,
            });
          }
        }
      };

      return createRecursiveProxy(callback, [], {
        _filters: {},
        _router: options.router,
        _subscribers: subscribers,
        _publisher: null,
      }) as RouterSubscriptions<TRouter>;
    },
  };
};
