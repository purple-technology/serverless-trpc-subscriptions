"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createWSClient, httpBatchLink, splitLink, wsLink } from "@trpc/client";
import { api } from "../api";

export interface ProviderProps {
  readonly children: React.ReactNode;
}

const wsClient = createWSClient({
  url: process.env.NEXT_PUBLIC_WS_URL ?? "",
});

export const Providers: React.FunctionComponent<ProviderProps> = ({
  children,
}) => {
  const [queryClient] = React.useState(() => new QueryClient());
  const [trpcClient] = React.useState(() =>
    api.createClient({
      links: [
        splitLink({
          condition: (op) => op.type === "subscription",
          true: wsLink({
            client: wsClient,
          }),
          false: httpBatchLink({
            url: `${process.env.NEXT_PUBLIC_HTTP_URL}/api` ?? "",
          }),
        }),
      ],
    })
  );
  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </api.Provider>
  );
};
