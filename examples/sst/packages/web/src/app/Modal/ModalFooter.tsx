export interface ModalFooterProps {
  readonly children: React.ReactNode;
}

export const ModalFooter: React.FunctionComponent<ModalFooterProps> = ({
  children,
}) => {
  return <div className="flex gap-2">{children}</div>;
};
