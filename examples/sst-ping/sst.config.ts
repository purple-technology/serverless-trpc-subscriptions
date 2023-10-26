import { SSTConfig } from "sst";
import { ApiStack } from "./stacks/ApiStack";
import { WebStack } from "./stacks/WebStack";

export default {
  config(_input) {
    return {
      name: "example-sst-ping",
      region: "eu-central-1",
    };
  },
  stacks(app) {
    app.stack(ApiStack).stack(WebStack);
  },
} satisfies SSTConfig;
