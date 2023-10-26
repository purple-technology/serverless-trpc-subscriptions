export interface Options<TInput, TContext = {}> {
  readonly input: TInput;
  readonly ctx: TContext;
}
