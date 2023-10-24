import { AnyFilterOption } from "../subscriptions/subscriptions";

export interface BuildSKOptions {
  readonly input: unknown;
  readonly ctx: unknown;
  readonly filter: AnyFilterOption;
  readonly path: string;
  readonly suffix?: string;
}

const buildInputSK = (options: BuildSKOptions) => {
  const filters = options.filter.input;
  const input = options.input;

  if (filters == null) return [];

  if (typeof input !== "object" || input == null) [];

  return ["input"].concat(
    Object.keys(filters).map((key) => {
      const value = (input as Record<string, unknown>)[key];
      return `${key}#${value}`;
    })
  );
};

const buildCtxSK = (options: BuildSKOptions) => {
  const filters = options.filter.ctx;
  const ctx = options.ctx;

  if (filters == null) return [];

  if (typeof ctx !== "object" || ctx == null) return [];

  return ["ctx"].concat(
    Object.keys(filters).map((key) => {
      const value = (ctx as Record<string, unknown>)[key];
      return `${key}#${value}`;
    })
  );
};

export const buildSK = (options: BuildSKOptions): string | undefined => {
  const input = buildInputSK(options);
  const ctx = buildCtxSK(options);

  const inputAndCtx = ["name", options.filter.name]
    .concat(ctx)
    .concat(input)
    .concat(options.suffix ? [options.suffix] : []);

  if (inputAndCtx.length > 0) return inputAndCtx.join("#");

  return undefined;
};
