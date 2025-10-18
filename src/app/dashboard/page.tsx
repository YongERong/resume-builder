'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '~/trpc/react';
import { ProjectSidebar } from '~/components/sidebar/ProjectSidebar';
import { CreateProjectModal } from '~/components/projects/CreateProjectModal';

export default function DashboardPage() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const { data: projectsData, isLoading } = api.project.list.useQuery({
    limit: 1,
  });
  const { data: profile } = api.profile.get.useQuery();

  useEffect(() => {
    if (!isLoading && projectsData) {
      const projects = projectsData.projects;
      // If user has projects, redirect to the most recent one
      const firstProject = projects[0];
      if (firstProject) {
        router.push(`/projects/${firstProject.id}`);
      }
    }
  }, [isLoading, projectsData, router]);


  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show welcome screen if no projects exist
  if (projectsData && projectsData.projects.length === 0) {
  return (
    <div className="flex min-h-screen bg-gray-50">
        <ProjectSidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
        
        <div className="flex flex-1 items-center justify-center">
          <div className="mx-auto max-w-2xl text-center">
            <svg
              className="mx-auto h-24 w-24 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h2 className="mt-4 text-3xl font-bold text-gray-900">
              Welcome to Resume Builder
            </h2>
            <p className="mt-2 text-gray-600">
              Create your first project to start building tailored resumes for your job applications.
            </p>
            <div className="mt-8 space-y-4">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-500"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Your First Project
              </button>
              <div className="text-sm text-gray-500">
                or{' '}
                <button
                  onClick={() => router.push('/dashboard/experiences')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  manage your experiences
                </button>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="text-3xl">📁</div>
                <h3 className="mt-2 font-semibold text-gray-900">Organize Projects</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Create a project for each job application
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="text-3xl">📚</div>
                <h3 className="mt-2 font-semibold text-gray-900">Build Library</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Manage your experiences in one place
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="text-3xl">🎯</div>
                <h3 className="mt-2 font-semibold text-gray-900">Tailor Resumes</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Customize each resume for the job
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <CreateProjectModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </div>
    );
  }

  // Otherwise, will redirect via useEffect
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-lg">Redirecting to your project...</div>
    </div>
  );
}

