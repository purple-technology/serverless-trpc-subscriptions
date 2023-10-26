import { z } from "zod";
import { Lane } from "./lanes";

export const Issue = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  lane: Lane,
  status: z.enum(["Creating", "Created"]),
});

export type Issue = z.infer<typeof Issue>;

export const CreateIssueInput = Issue.pick({
  title: true,
  description: true,
  lane: true,
});

export type CreateIssueInput = z.infer<typeof CreateIssueInput>;
