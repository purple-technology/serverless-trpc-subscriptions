export interface FieldProps {
  readonly children: React.ReactNode;
  readonly validation?: string;
}

export const Field: React.FunctionComponent<FieldProps> = ({
  children,
  validation,
}) => {
  return (
    <div className="w-full">
      {children}
      {validation && <span className="px-1 text-red-400">{validation}</span>}
    </div>
  );
};
