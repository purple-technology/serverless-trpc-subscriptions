import { Lane } from "@serverless-trpc-subscriptions/examples-sst-core/lanes";
import * as React from "react";
import { api } from "../api";

import { IssueItem } from "../IssueItem/IssueItem";

export interface LaneItemProps {
  readonly lane: Lane;
}

export const LaneItem: React.FunctionComponent<LaneItemProps> = ({ lane }) => {
  const ctx = api.useContext();
  const { data: issues } = api.issues.byLane.useQuery(
    {
      lane,
    },
    {
      initialData: [],
      staleTime: Infinity,
      select: (issues) => issues.filter((issue) => issue.status === "Created"),
    }
  );

  api.issues.onCreated.useSubscription(
    {
      lane,
    },
    {
      onData: (createdIssue) =>
        ctx.issues.byLane.setData(
          {
            lane,
          },
          (issues) =>
            issues
              ?.filter((existingIssue) => existingIssue.id !== createdIssue.id)
              .concat([createdIssue])
        ),
    }
  );

  return (
    <div className="flex flex-1 flex-col gap-5">
      <h1 className="text-lg">{lane}</h1>
      {issues.map((issue) => (
        <IssueItem key={issue.id} issue={issue} />
      ))}
    </div>
  );
};
