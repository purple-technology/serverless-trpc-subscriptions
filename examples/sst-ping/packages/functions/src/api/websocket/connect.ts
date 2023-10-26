import { appSubscriptions } from "../trpc";

export const main = appSubscriptions.connect();
