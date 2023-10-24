import { awsLambdaRequestHandler } from "@trpc/server/adapters/aws-lambda";
import { appRouter } from "./root";

export const main = awsLambdaRequestHandler({
  router: appRouter,
});
