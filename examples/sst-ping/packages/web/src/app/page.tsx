"use client";
import React from "react";
import { api } from "./api";

export default function Home() {
  const [count, setCount] = React.useState(0);

  api.onPing.useSubscription(
    { name: "name1" },
    {
      onData: () => setCount((count) => count + 1),
    }
  );

  return (
    <main className="flex justify-center content-center items-center h-screen">
      <span className="text-4xl">{count}</span>
    </main>
  );
}
