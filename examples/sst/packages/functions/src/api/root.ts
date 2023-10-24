import { issuesRouter } from "./routers/issues/issues";
import { subscriptions, t } from "./trpc";

export const appRouter = t.router({
  issues: issuesRouter,
});

export type AppRouter = typeof appRouter;

export const appSubscriptions = subscriptions
  .router({ router: appRouter })
  .routes.issues.onCreated.filter({
    name: "lane",
    input: { lane: true },
  });
