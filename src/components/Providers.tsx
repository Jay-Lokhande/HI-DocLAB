"use client"

import { PropsWithChildren, useState } from "react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query"
import { trpc } from "@/app/_trpc/client";
import { httpBatchLink } from "@trpc/client";
const Providers = ({children}: PropsWithChildren) => {
    const [queryClient] = useState(() => new QueryClient())
    const [trapClient] = useState(() => 
    trpc.createClient({
        links: [
            httpBatchLink({
                url: 'https://hidoclab.vercel.app/api/trpc',
            }),
        ],
    })
    )
    return (
        <trpc.Provider client={trapClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </trpc.Provider>
    )
}
export default Providers;
