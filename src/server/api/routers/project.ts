import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { ProjectStatus } from "@prisma/client";

export const projectRouter = createTRPCRouter({
  // Get all projects for the current user
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.nativeEnum(ProjectStatus).optional(),
          limit: z.number().min(1).max(100).default(50),
          cursor: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const cursor = input?.cursor;

      const projects = await ctx.db.project.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.status && { status: input.status }),
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          updatedAt: "desc",
        },
        include: {
          resume: true,
          jobAnalysis: true,
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (projects.length > limit) {
        const nextItem = projects.pop();
        nextCursor = nextItem!.id;
      }

      return {
        projects,
        nextCursor,
      };
    }),

  // Get a single project by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
        include: {
          resume: true,
          jobAnalysis: true,
        },
      });

      if (!project) {
        throw new Error("Project not found");
      }

      return project;
    }),

  // Create a new project
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        company: z.string().optional(),
        jobUrl: z.string().url().optional().or(z.literal("")),
        status: z.nativeEnum(ProjectStatus).default("ACTIVE"),
        tags: z.array(z.string()).default([]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create project with associated resume
      const project = await ctx.db.project.create({
        data: {
          userId: ctx.userId,
          title: input.title,
          company: input.company,
          jobUrl: input.jobUrl || null,
          status: input.status,
          tags: input.tags,
          notes: input.notes,
          resume: {
            create: {
              userId: ctx.userId,
              title: input.title,
              content: {
                header: [],
                education: [],
                academic_project: [],
                internship: [],
                work: [],
                leadership: [],
                technical_skills: [],
                interests: [],
              },
            },
          },
        },
        include: {
          resume: true,
          jobAnalysis: true,
        },
      });

      return project;
    }),

  // Update an existing project
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        company: z.string().optional(),
        jobUrl: z.string().url().optional().or(z.literal("")),
        status: z.nativeEnum(ProjectStatus).optional(),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify ownership
      const existing = await ctx.db.project.findFirst({
        where: { id, userId: ctx.userId },
      });

      if (!existing) {
        throw new Error("Project not found");
      }

      const project = await ctx.db.project.update({
        where: { id },
        data: {
          ...data,
          jobUrl: data.jobUrl === "" ? null : data.jobUrl,
        },
        include: {
          resume: true,
          jobAnalysis: true,
        },
      });

      return project;
    }),

  // Delete a project
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.project.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });

      if (!existing) {
        throw new Error("Project not found");
      }

      await ctx.db.project.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Duplicate a project
  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get the original project
      const original = await ctx.db.project.findFirst({
        where: { id: input.id, userId: ctx.userId },
        include: { resume: true },
      });

      if (!original) {
        throw new Error("Project not found");
      }

      // Create a duplicate
      const duplicate = await ctx.db.project.create({
        data: {
          userId: ctx.userId,
          title: `${original.title} (Copy)`,
          company: original.company,
          jobUrl: original.jobUrl,
          status: "ACTIVE",
          tags: original.tags,
          notes: original.notes,
          resume: original.resume
            ? {
                create: {
                  userId: ctx.userId,
                  title: `${original.resume.title} (Copy)`,
                  content: original.resume.content,
                },
              }
            : undefined,
        },
        include: {
          resume: true,
          jobAnalysis: true,
        },
      });

      return duplicate;
    }),

  // Get recent projects (for quick access)
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(10).default(5) }))
    .query(async ({ ctx, input }) => {
      const projects = await ctx.db.project.findMany({
        where: {
          userId: ctx.userId,
        },
        take: input.limit,
        orderBy: {
          updatedAt: "desc",
        },
        include: {
          resume: true,
        },
      });

      return projects;
    }),

  // Search projects
  search: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const projects = await ctx.db.project.findMany({
        where: {
          userId: ctx.userId,
          OR: [
            { title: { contains: input.query, mode: "insensitive" } },
            { company: { contains: input.query, mode: "insensitive" } },
            { notes: { contains: input.query, mode: "insensitive" } },
            { tags: { has: input.query } },
          ],
        },
        take: input.limit,
        orderBy: {
          updatedAt: "desc",
        },
        include: {
          resume: true,
          jobAnalysis: true,
        },
      });

      return projects;
    }),

  // Get project stats (count by status)
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [active, archived, submitted, interview, rejected, accepted, total] =
      await Promise.all([
        ctx.db.project.count({
          where: { userId: ctx.userId, status: "ACTIVE" },
        }),
        ctx.db.project.count({
          where: { userId: ctx.userId, status: "ARCHIVED" },
        }),
        ctx.db.project.count({
          where: { userId: ctx.userId, status: "SUBMITTED" },
        }),
        ctx.db.project.count({
          where: { userId: ctx.userId, status: "INTERVIEW" },
        }),
        ctx.db.project.count({
          where: { userId: ctx.userId, status: "REJECTED" },
        }),
        ctx.db.project.count({
          where: { userId: ctx.userId, status: "ACCEPTED" },
        }),
        ctx.db.project.count({
          where: { userId: ctx.userId },
        }),
      ]);

    return {
      active,
      archived,
      submitted,
      interview,
      rejected,
      accepted,
      total,
    };
  }),
});

