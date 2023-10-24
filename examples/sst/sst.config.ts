import { SSTConfig } from "sst";
import { ApiStack } from "./stacks/ApiStack";
import { WebStack } from "./stacks/WebStack";

export default {
  config(_input) {
    return {
      name: "trpc-subscriptions-sst-example",
      region: "eu-central-1",
    };
  },
  stacks(app) {
    app.stack(ApiStack).stack(WebStack);
  },
} satisfies SSTConfig;
