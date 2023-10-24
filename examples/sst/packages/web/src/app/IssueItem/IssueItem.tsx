import { Issue } from "@serverless-trpc-subscriptions/examples-sst-core/issues.entities";
import * as React from "react";

export interface IssueProps {
  readonly issue: Issue;
}

export const IssueItem: React.FunctionComponent<IssueProps> = (props) => {
  return (
    <div className="flex flex-col shadow rounded bg-gray-600 p-4 gap-2">
      <h1 className="text-md">{props.issue.title}</h1>
      <span>{props.issue.description}</span>
    </div>
  );
};
