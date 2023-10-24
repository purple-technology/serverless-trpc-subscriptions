export interface ModalBodyProps {
  readonly children: React.ReactNode;
}

export const ModalBody: React.FunctionComponent<ModalBodyProps> = ({
  children,
}) => {
  return <div className="flex flex-col gap-3">{children}</div>;
};
