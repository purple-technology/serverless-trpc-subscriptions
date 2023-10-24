export type ButtonProps = JSX.IntrinsicElements["button"] & {
  readonly isLoading?: boolean;
};

export const Button: React.FunctionComponent<ButtonProps> = ({
  isLoading,
  ...props
}) => {
  return (
    <button
      {...props}
      className="bg-gray-600 hover:bg-gray-700 rounded px-4 py-2"
    >
      {isLoading ? (
        <div className="border-gray-700 h-7 w-7 animate-spin rounded-full border-4 border-t-gray-500" />
      ) : (
        props.children
      )}
    </button>
  );
};
