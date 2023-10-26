import { Handler } from "aws-lambda";
import { publisher } from "./publisher";

export const main: Handler = async () => {
  await publisher.routes.onPing.publish({
    data: "ping",
    filter: {
      name: "name",
      input: {
        name: "name1",
      },
    },
  });
};
