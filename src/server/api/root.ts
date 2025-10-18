import { profileRouter } from "~/server/api/routers/profile";
import { experienceRouter } from "~/server/api/routers/experience";
import { resumeRouter } from "~/server/api/routers/resume";
import { jobAnalysisRouter } from "~/server/api/routers/jobAnalysis";
import { projectRouter } from "~/server/api/routers/project";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  profile: profileRouter,
  experience: experienceRouter,
  resume: resumeRouter,
  jobAnalysis: jobAnalysisRouter,
  project: projectRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
