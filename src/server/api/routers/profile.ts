import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const profileRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.userProfile.findUnique({
      where: { userId: ctx.user.id },
    });

    return profile;
  }),

  update: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        mobile: z.string().min(1),
        email: z.string().email(),
        linkedin: z.string().url().optional().or(z.literal("")),
        portfolio: z.string().url().optional().or(z.literal("")),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.userProfile.upsert({
        where: { userId: ctx.user.id },
        update: {
          name: input.name,
          mobile: input.mobile,
          email: input.email,
          linkedin: input.linkedin || null,
          portfolio: input.portfolio || null,
        },
        create: {
          userId: ctx.user.id,
          name: input.name,
          mobile: input.mobile,
          email: input.email,
          linkedin: input.linkedin || null,
          portfolio: input.portfolio || null,
        },
      });

      return profile;
    }),
});

