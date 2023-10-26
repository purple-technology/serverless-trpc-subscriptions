import * as React from "react";

export type InputProps = JSX.IntrinsicElements["input"];

const InputImpl: React.ForwardRefRenderFunction<
  HTMLInputElement,
  InputProps
> = (props, ref) => {
  return (
    <input
      ref={ref}
      className="px-1 appearance-none text-xl bg-inherit rounded w-full py-2 focus:outline-none focus:shadow-outline"
      {...props}
    />
  );
};

export const Input = React.forwardRef(InputImpl);
