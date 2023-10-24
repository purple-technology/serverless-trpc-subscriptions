import { event } from "./event";

import { Options } from "./options";
import { v4 } from "uuid";
import { CreateIssueInput, Issue } from "./issues.entities";

export const Events = {
  Create: event("issue.create", Issue.shape),
};

export const createIssue = async (
  options: Options<CreateIssueInput>
): Promise<Issue> => {
  const issue: Issue = {
    ...options.input,
    id: v4(),
    status: "Creating",
  };

  await Events.Create.publish(issue);

  return issue;
};
