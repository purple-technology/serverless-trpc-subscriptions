import * as React from "react";

export interface SelectItem {
  readonly label: string;
  readonly value: string;
}

export type SelectProps = JSX.IntrinsicElements["select"] & {
  readonly items: Array<SelectItem>;
};

const SelectImpl: React.ForwardRefRenderFunction<
  HTMLSelectElement,
  SelectProps
> = ({ items, ...props }: SelectProps, ref) => {
  return (
    <select
      ref={ref}
      className="bg-inherit focus:outline-none text-xl m-0 py-2 w-full"
      {...props}
    >
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
};

export const Select = React.forwardRef(SelectImpl);
