import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { ExperienceType } from "@prisma/client";

const experienceSchema = z.object({
  types: z.array(z.nativeEnum(ExperienceType)).min(1, "At least one type is required"),
  title: z.string().min(1),
  company: z.string().optional().nullable(),
  dateRange: z.string().optional().nullable(),
  bullets: z.array(z.string()),
  tags: z.array(z.string()),
  keywords: z.array(z.string()),
});

export const experienceRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          type: z.nativeEnum(ExperienceType).optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        userId: ctx.user.id,
      };

      if (input?.type) {
        // Filter by experiences that have this type in their types array
        where.types = { has: input.type };
      }

      if (input?.search) {
        where.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { company: { contains: input.search, mode: "insensitive" } },
          { tags: { has: input.search.toLowerCase() } as any },
          { keywords: { has: input.search.toLowerCase() } as any },
        ];
      }

      const experiences = await ctx.db.experience.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      return experiences;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const experience = await ctx.db.experience.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      return experience;
    }),

  create: protectedProcedure
    .input(experienceSchema)
    .mutation(async ({ ctx, input }) => {
      const experience = await ctx.db.experience.create({
        data: {
          userId: ctx.user.id,
          ...input,
        },
      });

      return experience;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: experienceSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const experience = await ctx.db.experience.updateMany({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
        data: input.data,
      });

      return experience;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.experience.deleteMany({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      return { success: true };
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      const experiences = await ctx.db.experience.findMany({
        where: {
          userId: ctx.user.id,
          OR: [
            { title: { contains: input.query, mode: "insensitive" } },
            { company: { contains: input.query, mode: "insensitive" } },
            { tags: { has: input.query.toLowerCase() } as any },
            { keywords: { has: input.query.toLowerCase() } as any },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      return experiences;
    }),
});

