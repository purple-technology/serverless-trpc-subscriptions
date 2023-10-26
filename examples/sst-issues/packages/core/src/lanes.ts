import { z } from "zod";

export const Lane = z.enum(["Backlog", "Doing", "Review", "Done"]);

export type Lane = z.infer<typeof Lane>;
