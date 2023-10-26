import { createIssue } from "@serverless-trpc-subscriptions/examples-sst-issues-core/issues";
import {
  CreateIssueInput,
  Issue,
} from "@serverless-trpc-subscriptions/examples-sst-issues-core/issues.entities";
import { subscriptions, t } from "../../trpc";

export const issuesRouter = t.router({
  byLane: t.procedure.input(CreateIssueInput.pick({ lane: true })).query(() => {
    const issues: Array<Issue> = [];
    return issues;
  }),
  create: t.procedure.input(CreateIssueInput).mutation(createIssue),
  onCreated: t.procedure
    .input(CreateIssueInput.pick({ lane: true }))
    .subscription(subscriptions.resolver<Issue>()),
});
