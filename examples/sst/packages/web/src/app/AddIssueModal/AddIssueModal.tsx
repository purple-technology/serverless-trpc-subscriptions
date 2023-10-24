"use client";
import { Button } from "../Button/Button";
import { Input } from "../Input/Input";
import { Modal, ModalProps } from "../Modal/Modal";
import { ModalBody } from "../Modal/ModalBody";
import { ModalFooter } from "../Modal/ModalFooter";
import { Select } from "../Select/Select";
import { api } from "../api";
import * as React from "react";
import { Lane } from "@serverless-trpc-subscriptions/examples-sst-core/lanes";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateIssueInput } from "@serverless-trpc-subscriptions/examples-sst-core/issues.entities";
import { Field } from "../Field/Field";

export interface AddIssueModalProps extends Omit<ModalProps, "children"> {
  readonly onCancel: () => void;
}

const items = Lane.options.map((lane) => ({
  label: lane,
  value: lane,
}));

export const AddIssueModal: React.FunctionComponent<AddIssueModalProps> = ({
  show,
  onCancel,
}) => {
  const { register, handleSubmit, formState } = useForm<CreateIssueInput>({
    resolver: zodResolver(CreateIssueInput),
  });

  const context = api.useContext();

  const createIssueMutation = api.issues.create.useMutation({
    onSuccess: (data) =>
      context.issues.byLane.setData({ lane: data.lane }, (issues) =>
        issues?.concat([data])
      ),
  });

  const laneOfIssueBeingCreated = createIssueMutation.data?.lane ?? "Backlog";

  const { data: isLoading } = api.issues.byLane.useQuery(
    {
      lane: laneOfIssueBeingCreated,
    },
    {
      enabled: createIssueMutation.data != null,
      staleTime: Infinity,
      select: (issues) =>
        issues.some(
          (issue) =>
            issue.id === createIssueMutation.data?.id &&
            issue.status === "Creating"
        ),
    }
  );

  return (
    <Modal show={show}>
      <form
        onSubmit={handleSubmit((data) => {
          createIssueMutation.mutate(data);
        })}
        className="flex flex-col gap-5"
      >
        <ModalBody>
          <Field validation={formState.errors.title?.message}>
            <Input
              autoFocus
              {...register("title")}
              placeholder="Please enter a title"
            />
          </Field>
          <Field validation={formState.errors.description?.message}>
            <Input
              {...register("description")}
              placeholder="Please enter a description"
            />
          </Field>
          <Field validation={formState.errors.lane?.message}>
            <Select {...register("lane")} items={items} />
          </Field>
        </ModalBody>
        <ModalFooter>
          <Button
            type="submit"
            isLoading={createIssueMutation.isLoading || isLoading}
          >
            Add
          </Button>
          <Button type="button" onClick={onCancel}>
            Cancel
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
