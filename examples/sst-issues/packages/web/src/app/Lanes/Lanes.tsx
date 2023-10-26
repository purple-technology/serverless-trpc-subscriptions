import { Lane } from "@serverless-trpc-subscriptions/examples-sst-issues-core/lanes";
import { LaneItem } from "../LaneItem/LaneItem";

export const Lanes: React.FunctionComponent = () => {
  return (
    <div className="flex gap-5 py-5 px-5">
      {Lane.options.map((lane) => (
        <LaneItem key={lane} lane={lane} />
      ))}
    </div>
  );
};
