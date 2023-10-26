import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@serverless-trpc-subscriptions/examples-sst-issues-functions/api/root";

export const api = createTRPCReact<AppRouter>();
