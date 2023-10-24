import { initTRPC } from "@trpc/server";
import { initSubscriptions } from "@serverless-trpc-subscriptions/adaptor-websocket";

export interface Context {
  readonly userId: string;
}

export const t = initTRPC.context<Context>().create();

export const subscriptions = initSubscriptions();
