'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import { ProjectItem } from './ProjectItem';
import { ProjectSearch } from './ProjectSearch';
import { CreateProjectModal } from '~/components/projects/CreateProjectModal';
import { ProjectStatus } from '@prisma/client';
import { useRouter } from 'next/navigation';

interface ProjectSidebarProps {
  currentProjectId?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ProjectSidebar({ 
  currentProjectId, 
  collapsed = false,
  onToggleCollapse 
}: ProjectSidebarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'ALL'>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const { data: projectsData, isLoading } = api.project.list.useQuery({
    status: filterStatus === 'ALL' ? undefined : filterStatus,
  });
  
  const { data: stats } = api.project.getStats.useQuery();

  const projects = projectsData?.projects ?? [];
  
  // Filter projects by search query
  const filteredProjects = searchQuery
    ? projects.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.company?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : projects;

  // Group projects by time period
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groupedProjects = {
    today: filteredProjects.filter((p) => new Date(p.updatedAt) >= today),
    thisWeek: filteredProjects.filter(
      (p) => new Date(p.updatedAt) >= weekAgo && new Date(p.updatedAt) < today
    ),
    thisMonth: filteredProjects.filter(
      (p) => new Date(p.updatedAt) >= monthAgo && new Date(p.updatedAt) < weekAgo
    ),
    older: filteredProjects.filter((p) => new Date(p.updatedAt) < monthAgo),
  };

  if (collapsed) {
    return (
      <>
        <div className="flex h-full w-16 flex-col items-center border-r border-gray-200 bg-white py-4">
          <button
            onClick={onToggleCollapse}
            className="mb-4 rounded-md p-2 hover:bg-gray-100"
            title="Expand sidebar"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded-md p-2 hover:bg-gray-100"
            title="New project"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        <CreateProjectModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="flex h-full w-80 flex-col border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
        <button
          onClick={onToggleCollapse}
          className="rounded-md p-1 hover:bg-gray-100"
          title="Collapse sidebar"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* New Project Button */}
      <div className="border-b border-gray-200 p-4">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          + New Project
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-gray-200 p-4">
        <ProjectSearch value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Filter by Status */}
      <div className="border-b border-gray-200 p-4">
        <div className="space-y-1 text-sm">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`flex w-full items-center justify-between rounded px-2 py-1 hover:bg-gray-100 ${
              filterStatus === 'ALL' ? 'bg-gray-100 font-medium' : ''
            }`}
          >
            <span>📁 All Projects</span>
            <span className="text-gray-500">{stats?.total ?? 0}</span>
          </button>
          <button
            onClick={() => setFilterStatus('ACTIVE')}
            className={`flex w-full items-center justify-between rounded px-2 py-1 hover:bg-gray-100 ${
              filterStatus === 'ACTIVE' ? 'bg-gray-100 font-medium' : ''
            }`}
          >
            <span>🔵 Active</span>
            <span className="text-gray-500">{stats?.active ?? 0}</span>
          </button>
          <button
            onClick={() => setFilterStatus('SUBMITTED')}
            className={`flex w-full items-center justify-between rounded px-2 py-1 hover:bg-gray-100 ${
              filterStatus === 'SUBMITTED' ? 'bg-gray-100 font-medium' : ''
            }`}
          >
            <span>📤 Submitted</span>
            <span className="text-gray-500">{stats?.submitted ?? 0}</span>
          </button>
          <button
            onClick={() => setFilterStatus('INTERVIEW')}
            className={`flex w-full items-center justify-between rounded px-2 py-1 hover:bg-gray-100 ${
              filterStatus === 'INTERVIEW' ? 'bg-gray-100 font-medium' : ''
            }`}
          >
            <span>💼 Interview</span>
            <span className="text-gray-500">{stats?.interview ?? 0}</span>
          </button>
          <button
            onClick={() => setFilterStatus('ARCHIVED')}
            className={`flex w-full items-center justify-between rounded px-2 py-1 hover:bg-gray-100 ${
              filterStatus === 'ARCHIVED' ? 'bg-gray-100 font-medium' : ''
            }`}
          >
            <span>📦 Archived</span>
            <span className="text-gray-500">{stats?.archived ?? 0}</span>
          </button>
        </div>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-gray-500">Loading projects...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            {searchQuery ? 'No projects match your search' : 'No projects yet. Create one to get started!'}
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {groupedProjects.today.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Today</h3>
                <div className="space-y-1">
                  {groupedProjects.today.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      isActive={project.id === currentProjectId}
                    />
                  ))}
                </div>
              </div>
            )}

            {groupedProjects.thisWeek.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">This Week</h3>
                <div className="space-y-1">
                  {groupedProjects.thisWeek.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      isActive={project.id === currentProjectId}
                    />
                  ))}
                </div>
              </div>
            )}

            {groupedProjects.thisMonth.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">This Month</h3>
                <div className="space-y-1">
                  {groupedProjects.thisMonth.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      isActive={project.id === currentProjectId}
                    />
                  ))}
                </div>
              </div>
            )}

            {groupedProjects.older.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Older</h3>
                <div className="space-y-1">
                  {groupedProjects.older.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      isActive={project.id === currentProjectId}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={() => router.push('/dashboard/experiences')}
          className="w-full rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          📚 Manage Experiences
        </button>
      </div>
      
      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

