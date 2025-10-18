import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const resumeRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const resumes = await ctx.db.resume.findMany({
      where: { userId: ctx.user.id },
      orderBy: { updatedAt: "desc" },
    });

    return resumes;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const resume = await ctx.db.resume.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      return resume;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        content: z.any(), // JSON content with droppedItems structure
      })
    )
    .mutation(async ({ ctx, input }) => {
      const resume = await ctx.db.resume.create({
        data: {
          userId: ctx.user.id,
          title: input.title,
          content: input.content,
        },
      });

      return resume;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        content: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const resume = await ctx.db.resume.updateMany({
        where: {
          id,
          userId: ctx.user.id,
        },
        data,
      });

      return resume;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.resume.deleteMany({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      return { success: true };
    }),

  autoGenerate: protectedProcedure
    .input(
      z.object({
        jobAnalysisId: z.string().optional(),
        keywords: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get all user experiences
      const experiences = await ctx.db.experience.findMany({
        where: { userId: ctx.user.id },
      });

      // Calculate relevance for each experience
      const experiencesWithRelevance = experiences.map((exp) => {
        const expKeywords = [...exp.keywords, ...exp.tags];
        const matches = expKeywords.filter((keyword: string) =>
          input.keywords.some(
            (jobKeyword: string) =>
              keyword.toLowerCase().includes(jobKeyword.toLowerCase()) ||
              jobKeyword.toLowerCase().includes(keyword.toLowerCase())
          )
        );

        const relevanceScore =
          input.keywords.length > 0
            ? Math.min(
                Math.round((matches.length / input.keywords.length) * 100),
                100
              )
            : 0;

        return { experience: exp, relevanceScore };
      });

      // Filter and sort by relevance
      const relevantExperiences = experiencesWithRelevance
        .filter((item: any) => item.relevanceScore > 30)
        .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);

      // Build resume content structure
      const content: any = {
        header: [],
        education: [],
        academic_project: [],
        internship: [],
        work: [],
        leadership: [],
        technical_skills: [],
        interests: [],
      };

      // Map experiences to sections
      const sectionMapping: Record<string, string> = {
        education: "education",
        exchange: "education",
        academic_project: "academic_project",
        internship: "internship",
        work: "work",
        leadership: "leadership",
        volunteer: "leadership",
        club: "leadership",
        competition: "leadership",
        technical_skills: "technical_skills",
        language_skills: "technical_skills",
        certifications: "technical_skills",
        interests: "interests",
        hobbies: "interests",
        sports: "interests",
        personal: "interests",
      };

      relevantExperiences.forEach((item: any) => {
        const section = sectionMapping[item.experience.type];
        if (section && content[section].length < 3) {
          content[section].push(item.experience);
        }
      });

      return { content, relevantExperiences: relevantExperiences.length };
    }),
});

