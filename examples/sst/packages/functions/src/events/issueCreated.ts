import { EventHandler } from "sst/node/event-bus";
import { Issue } from "@serverless-trpc-subscriptions/examples-sst-core/issues.entities";
import { Events } from "@serverless-trpc-subscriptions/examples-sst-core/issues";

import { pusher } from "./pusher";

export const main = EventHandler(Events.Create, async (event) => {
  const issue: Issue = {
    ...event.properties,
    status: "Created",
  };

  await pusher.routes.issues.onCreated.push({
    data: issue,
    filter: {
      name: "lane",
      input: {
        lane: event.properties.lane,
      },
    },
  });
});
