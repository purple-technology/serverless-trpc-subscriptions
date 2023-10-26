import { NextjsSite, StackContext, use } from "sst/constructs";
import { ApiStack } from "./ApiStack";

export const WebStack = (context: StackContext) => {
  const { websocket } = use(ApiStack);

  new NextjsSite(context.stack, "Web", {
    path: "./packages/web",
    environment: {
      NEXT_PUBLIC_WS_URL: websocket.url,
    },
  });
};
