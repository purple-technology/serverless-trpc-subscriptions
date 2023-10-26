import { EventHandler } from "sst/node/event-bus";
import { Issue } from "@serverless-trpc-subscriptions/examples-sst-issues-core/issues.entities";
import { Events } from "@serverless-trpc-subscriptions/examples-sst-issues-core/issues";

import { publisher } from "./publisher";

export const main = EventHandler(Events.Create, async (event) => {
  const issue: Issue = {
    ...event.properties,
    status: "Created",
  };

  await publisher.routes.issues.onCreated.publish({
    data: issue,
    filter: {
      name: "lane",
      input: {
        lane: event.properties.lane,
      },
    },
  });
});
