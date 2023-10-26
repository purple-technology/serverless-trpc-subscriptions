import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@serverless-trpc-subscriptions/examples-sst-ping-functions/api/trpc";

export const api = createTRPCReact<AppRouter>();
