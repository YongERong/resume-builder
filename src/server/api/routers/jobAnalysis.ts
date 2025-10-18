import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "~/env";
import FirecrawlApp from "@mendable/firecrawl-js";

// Common job-related keywords for fallback keyword extraction
const COMMON_KEYWORDS = [
  "python",
  "javascript",
  "typescript",
  "react",
  "node",
  "sql",
  "data analysis",
  "machine learning",
  "project management",
  "leadership",
  "team collaboration",
  "problem solving",
  "communication",
  "optimization",
  "automation",
  "tableau",
  "excel",
  "engineering",
  "operations",
  "process improvement",
  "agile",
  "scrum",
  "cloud",
  "aws",
  "azure",
  "docker",
  "kubernetes",
];

// Simple keyword extraction from text
function extractKeywordsSimple(text: string): string[] {
  const lowerText = text.toLowerCase();
  const foundKeywords = COMMON_KEYWORDS.filter((keyword) =>
    lowerText.includes(keyword.toLowerCase())
  );

  // Remove duplicates
  return [...new Set(foundKeywords)];
}

export const jobAnalysisRouter = createTRPCRouter({
  analyze: protectedProcedure
    .input(
      z.object({
        jobUrl: z.string().url().optional(),
        jobDescription: z.string().optional(),
        projectId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let scrapedContent = "";
      let userProvidedDescription = input.jobDescription || "";
      
      // Step 1: Scrape job listing with Firecrawl (if URL provided)
      if (input.jobUrl) {
        try {
          if (env.FIRECRAWL_API_KEY) {
            const firecrawl = new FirecrawlApp({ apiKey: env.FIRECRAWL_API_KEY });
            const scrapeResult = await firecrawl.scrape(input.jobUrl, {
              formats: ['markdown'],
            });
            
            if (scrapeResult && scrapeResult.markdown) {
              scrapedContent = scrapeResult.markdown;
            }
          }
        } catch (error) {
          console.error("Firecrawl API error:", error);
          // Don't throw - continue with user-provided description
        }
      }

      // Combine scraped content and user-provided description
      const combinedContent = [scrapedContent, userProvidedDescription]
        .filter(Boolean)
        .join("\n\n---\n\n");

      if (!combinedContent) {
        throw new Error("Please provide either a job URL or paste the job description.");
      }

      // Step 2: Extract structured information with Gemini
      let jobName: string | null = null;
      let companyName: string | null = null;
      let companyWebsite: string | null = null;
      let jobScope: string | null = null;
      let skills: string[] = [];
      let values: string[] = [];
      let keywords: string[] = [];
      let recruiterNotes: string | null = null;

      try {
        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.5-flash",
          generationConfig: {
            responseMimeType: "application/json",
          },
        });

        const prompt = `You are a helpful assistant that analyzes job listings. Extract structured information that will help candidates tailor their resumes.

Analyze this job listing and extract information. Even if the content is incomplete or contains mostly website navigation, extract whatever relevant information you can find.

Extract the following (use null or empty arrays if not found):
1. Job Title - The specific role being advertised (look for "Internship", "Engineer", "Developer", etc.)
2. Company Name - The hiring organization (look in URLs, headers, or mentions)
3. Company Website - Company website URL if mentioned (full URL with https://)
4. Job Scope - A concise summary of responsibilities and what the role entails (2-3 sentences, or general description based on job title)
5. Relevant Skills/Experience - Technical and soft skills mentioned (max 15 most important)
6. Values - Cultural values, mission, or working principles the company emphasizes
7. Keywords - Important keywords for ATS optimization (extract from any technical terms or role descriptions)
8. Recruiter Insights - 3-5 bullet points about what the hiring manager prioritizes (infer from context if not explicitly stated)

Job Listing Content:
${combinedContent}

IMPORTANT: 
- If the content is sparse, make reasonable inferences from URLs, company names, and any job-related keywords
- Always try to extract at least the company name and job title from the context
- If it's a government website (e.g., .gov.sg), note that in company name
- Extract any technical terms as skills/keywords even if not in a formal job description format

Format your response as JSON with these exact keys:
{
  "jobTitle": "string or null",
  "companyName": "string or null",
  "companyWebsite": "string or null",
  "jobScope": "string or null",
  "skills": ["string"],
  "values": ["string"],
  "keywords": ["string"],
  "recruiterInsights": "string with bullet points or null"
}`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        if (text) {
          const parsed = JSON.parse(text);
          jobName = parsed.jobTitle || null;
          companyName = parsed.companyName || null;
          companyWebsite = parsed.companyWebsite || null;
          jobScope = parsed.jobScope || null;
          skills = parsed.skills || [];
          values = parsed.values || [];
          keywords = parsed.keywords || [];
          recruiterNotes = parsed.recruiterInsights || null;
          
          console.log("✅ Gemini extracted:", {
            jobName,
            companyName,
            companyWebsite,
            skillsCount: skills.length,
            valuesCount: values.length,
            keywordsCount: keywords.length,
          });
        }
      } catch (error) {
        console.error("❌ Gemini API error:", error);
        // Continue with extracted description but without structured data
      }

      // Step 3: Combine with simple keyword extraction as fallback
      const simpleKeywords = extractKeywordsSimple(combinedContent);
      const allKeywords = [...new Set([...keywords, ...simpleKeywords])];

      // Step 4: Save to database (upsert if projectId exists)
      let jobAnalysis;
      
      if (input.projectId) {
        // Check if job analysis already exists for this project
        const existing = await ctx.db.jobAnalysis.findUnique({
          where: { projectId: input.projectId },
        });

        if (existing) {
          // Update existing job analysis
          jobAnalysis = await ctx.db.jobAnalysis.update({
            where: { projectId: input.projectId },
            data: {
              jobUrl: input.jobUrl || null,
              jobName,
              companyName,
              companyWebsite,
              jobScope,
              jobDescription: combinedContent,
              skills,
              values,
              keywords: allKeywords,
              recruiterNotes,
              analyzedAt: new Date(),
            },
          });
        } else {
          // Create new job analysis
          jobAnalysis = await ctx.db.jobAnalysis.create({
            data: {
              userId: ctx.user.id,
              projectId: input.projectId,
              jobUrl: input.jobUrl || null,
              jobName,
              companyName,
              companyWebsite,
              jobScope,
              jobDescription: combinedContent,
              skills,
              values,
              keywords: allKeywords,
              recruiterNotes,
            },
          });
        }
      } else {
        // No projectId - create standalone job analysis
        jobAnalysis = await ctx.db.jobAnalysis.create({
          data: {
            userId: ctx.user.id,
            projectId: null,
            jobUrl: input.jobUrl || null,
            jobName,
            companyName,
            companyWebsite,
            jobScope,
            jobDescription: combinedContent,
            skills,
            values,
            keywords: allKeywords,
            recruiterNotes,
          },
        });
      }

      return jobAnalysis;
    }),

  getLatest: protectedProcedure.query(async ({ ctx }) => {
    const latest = await ctx.db.jobAnalysis.findFirst({
      where: { userId: ctx.user.id },
      orderBy: { analyzedAt: "desc" },
    });

    return latest;
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const analyses = await ctx.db.jobAnalysis.findMany({
      where: { userId: ctx.user.id },
      orderBy: { analyzedAt: "desc" },
      take: 10,
    });

    return analyses;
  }),

  calculateRelevance: protectedProcedure
    .input(
      z.object({
        experienceId: z.string(),
        jobKeywords: z.array(z.string()),
      })
    )
    .query(async ({ ctx, input }) => {
      const experience = await ctx.db.experience.findFirst({
        where: {
          id: input.experienceId,
          userId: ctx.user.id,
        },
      });

      if (!experience) {
        return 0;
      }

      const expKeywords = [...experience.keywords, ...experience.tags];
      const matches = expKeywords.filter((keyword) =>
        input.jobKeywords.some(
          (jobKeyword) =>
            keyword.toLowerCase().includes(jobKeyword.toLowerCase()) ||
            jobKeyword.toLowerCase().includes(keyword.toLowerCase())
        )
      );

      const score =
        input.jobKeywords.length > 0
          ? Math.min(
              Math.round((matches.length / input.jobKeywords.length) * 100),
              100
            )
          : 0;

      return score;
    }),
});

