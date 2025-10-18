# Resume Builder - T3 Stack Application

A production-ready resume builder application built with the T3 Stack (Next.js, TypeScript, tRPC, Tailwind CSS), Supabase Auth, and Prisma ORM.

## Features

- **Multi-user Authentication**: Email/password and OAuth (Google, GitHub) via Supabase
- **AI-Powered Job Analysis**: Hybrid keyword matching + Google Gemini 1.5 Flash for extracting job requirements
- **Experience Library**: Store and manage all your professional experiences
- **Tap-to-Add Interface**: Mobile-first design with modal-based experience selection (no drag-and-drop)
- **ATS-Compatible PDF Export**: Generate properly formatted resumes using jsPDF
- **Resume Validation**: Check ATS compatibility, length, and format
- **Auto-Generate**: Automatically create resumes based on job analysis
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **API**: tRPC
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Authentication**: Supabase Auth
- **AI**: Google Gemini API
- **PDF Generation**: jsPDF

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Supabase account
- Google Gemini API key (free tier available)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd app
pnpm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to find your keys
3. Enable Email and OAuth providers in Authentication > Providers
4. For Google OAuth:
   - Create OAuth credentials in Google Cloud Console
   - Add authorized redirect URI: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
5. For GitHub OAuth:
   - Create OAuth app in GitHub Settings
   - Add callback URL: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`

### 3. Configure Environment Variables

Create a `.env` file in the `app` directory:

```env
# Database (Supabase PostgreSQL connection string)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Google Gemini Configuration
GEMINI_API_KEY="your-gemini-api-key"

# Node Environment
NODE_ENV="development"
```

**Note**: 
- `DATABASE_URL` uses port 6543 (connection pooler)
- `DIRECT_URL` uses port 5432 (direct connection for migrations)

### 4. Initialize Database

```bash
# Generate Prisma client
pnpm prisma generate

# Push schema to database
pnpm db:push

# Seed database with sample data
pnpm db:seed
```

### 5. Run Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Database Schema

### User
- Managed by Supabase Auth
- Fields: id, email, name, createdAt, updatedAt

### UserProfile
- Contact information
- Fields: name, mobile, email, linkedin, portfolio

### Experience
- User's experience library
- Types: work, internship, education, exchange, academic_project, leadership, technical_skills, language_skills, interests
- Fields: type, title, company, dateRange, bullets (JSON), tags (array), keywords (array)

### Resume
- Saved resume drafts
- Fields: title, content (JSON with dropped items)

### JobAnalysis
- Analyzed job postings
- Fields: jobUrl, jobDescription, keywords (array), recruiterNotes

## Application Structure

```
app/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Sample data
├── src/
│   ├── app/
│   │   ├── (auth)/           # Authentication pages
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── callback/
│   │   ├── dashboard/        # Main resume builder
│   │   ├── api/trpc/         # tRPC API routes
│   │   └── page.tsx          # Landing page
│   ├── components/           # React components (to be added)
│   ├── lib/
│   │   └── supabase/         # Supabase client utilities
│   ├── server/
│   │   └── api/
│   │       ├── routers/      # tRPC routers
│   │       │   ├── profile.ts
│   │       │   ├── experience.ts
│   │       │   ├── resume.ts
│   │       │   └── jobAnalysis.ts
│   │       ├── root.ts       # Main router
│   │       └── trpc.ts       # tRPC config
│   └── env.js                # Environment validation
└── package.json
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm db:push` - Push schema changes to database
- `pnpm db:seed` - Seed database with sample data
- `pnpm db:studio` - Open Prisma Studio
- `pnpm typecheck` - Run TypeScript type checking

## API Routes (tRPC)

### Profile
- `profile.get` - Get user profile
- `profile.update` - Update user profile

### Experience
- `experience.list` - Get all experiences (with optional filters)
- `experience.get` - Get single experience
- `experience.create` - Create new experience
- `experience.update` - Update experience
- `experience.delete` - Delete experience
- `experience.search` - Search experiences

### Resume
- `resume.list` - Get all resumes
- `resume.get` - Get single resume
- `resume.create` - Create new resume
- `resume.update` - Update resume
- `resume.delete` - Delete resume
- `resume.autoGenerate` - Auto-generate resume based on job analysis

### Job Analysis
- `jobAnalysis.analyze` - Analyze job description (hybrid AI + keyword matching)
- `jobAnalysis.getLatest` - Get latest analysis
- `jobAnalysis.list` - Get all analyses
- `jobAnalysis.calculateRelevance` - Calculate experience relevance score

## Authentication Flow

1. User signs up/logs in via Supabase Auth
2. OAuth callback handled by `/auth/callback`
3. Middleware checks authentication on protected routes
4. User redirected to `/dashboard` after login
5. User session managed via Supabase cookies

## Job Analysis Flow

1. User inputs job URL or description
2. System performs simple keyword extraction
3. Google Gemini API analyzes for additional insights
4. Keywords combined and saved to database
5. Experience relevance scores calculated
6. Experiences ranked by relevance

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Make sure to set all environment variables in your deployment platform:
- `DATABASE_URL` and `DIRECT_URL` (from Supabase)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `NODE_ENV=production`

## Next Steps

### Planned Features

1. **UI Components**: Implement shadcn/ui for better design
2. **PDF Export**: Complete PDF generation with NTU template formatting
3. **Quality Validation**: Full ATS compatibility checks
4. **Mobile Optimizations**: Bottom drawer, FAB buttons, swipe gestures
5. **Experience Management**: Bulk import/export, drag-to-reorder
6. **Auto-save**: Automatic resume saving with debouncing
7. **Resume Templates**: Multiple professional templates
8. **Version History**: Track resume changes
9. **Sharing**: Share resumes via link
10. **Analytics**: Track which experiences perform best

### Current Implementation Status

✅ Project setup and infrastructure
✅ Database schema and migrations
✅ Supabase authentication
✅ tRPC API routers
✅ Basic dashboard UI
✅ Auth pages (login/signup)
✅ Tap-to-add interface
🚧 PDF export (jsPDF integration pending)
🚧 Quality validation system
🚧 Mobile optimizations
🚧 shadcn/ui components

## Troubleshooting

### Database Connection Issues

If you encounter database connection errors:
1. Check that your Supabase project is active
2. Verify DATABASE_URL uses connection pooler (port 6543)
3. Verify DIRECT_URL uses direct connection (port 5432)
4. Run `pnpm db:push` to sync schema

### Authentication Issues

If OAuth isn't working:
1. Check that providers are enabled in Supabase
2. Verify redirect URIs are correctly configured
3. Check browser console for errors
4. Verify environment variables are set

### Gemini API Issues

If job analysis fails:
1. Verify GEMINI_API_KEY is correctly set in `.env`
2. System will fall back to keyword matching if API fails
3. Check free tier limits (15 RPM, 1500 RPD) at [Google AI Studio](https://aistudio.google.com)
4. See `GEMINI_API_SETUP.md` for detailed setup instructions

## Contributing

1. Create a feature branch
2. Make changes
3. Run `pnpm typecheck` to check for errors
4. Test thoroughly
5. Submit pull request

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
