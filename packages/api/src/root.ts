import { authRouter } from "./router/auth";
import { pageRouter } from "./router/page";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  page: pageRouter,
  auth: authRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
