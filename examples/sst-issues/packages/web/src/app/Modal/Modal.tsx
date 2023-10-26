import * as React from "react";

export interface ModalProps {
  readonly children: React.ReactNode;
  readonly show: boolean;
}

export const Modal: React.FunctionComponent<ModalProps> = ({
  children,
  show,
}) => {
  if (!show) return null;

  return (
    <div className="fixed flex justify-center items-center left-0 top-0 right-0 bottom-0 transition-opacity">
      <div className="bg-gray-700 border-2 border-gray-800 rounded-lg shadow w-1/2 p-5">
        {children}
      </div>
    </div>
  );
};
