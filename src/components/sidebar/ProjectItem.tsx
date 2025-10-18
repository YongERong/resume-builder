'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '~/trpc/react';
import type { Project, Resume, JobAnalysis } from '@prisma/client';

interface ProjectItemProps {
  project: Project & {
    resume: Resume | null;
    jobAnalysis: JobAnalysis | null;
  };
  isActive: boolean;
}

const statusColors = {
  ACTIVE: 'bg-blue-500',
  ARCHIVED: 'bg-gray-500',
  SUBMITTED: 'bg-yellow-500',
  INTERVIEW: 'bg-purple-500',
  REJECTED: 'bg-red-500',
  ACCEPTED: 'bg-green-500',
};

const statusLabels = {
  ACTIVE: '🔵',
  ARCHIVED: '📦',
  SUBMITTED: '📤',
  INTERVIEW: '💼',
  REJECTED: '❌',
  ACCEPTED: '✅',
};

export function ProjectItem({ project, isActive }: ProjectItemProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const utils = api.useUtils();
  
  const deleteMutation = api.project.delete.useMutation({
    onSuccess: () => {
      void utils.project.list.invalidate();
      void utils.project.getStats.invalidate();
      if (isActive) {
        router.push('/dashboard');
      }
    },
  });

  const duplicateMutation = api.project.duplicate.useMutation({
    onSuccess: (newProject) => {
      void utils.project.list.invalidate();
      void utils.project.getStats.invalidate();
      router.push(`/projects/${newProject.id}`);
    },
  });

  const updateMutation = api.project.update.useMutation({
    onSuccess: () => {
      void utils.project.list.invalidate();
      void utils.project.getStats.invalidate();
    },
  });

  const handleClick = () => {
    router.push(`/projects/${project.id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete project "${project.title}"?`)) {
      deleteMutation.mutate({ id: project.id });
    }
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateMutation.mutate({ id: project.id });
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newTitle = prompt('Enter new project title:', project.title);
    if (newTitle && newTitle !== project.title) {
      updateMutation.mutate({ id: project.id, title: newTitle });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMenu(true);
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={`group relative w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
          isActive
            ? 'bg-blue-50 text-blue-900 font-medium'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base">{statusLabels[project.status]}</span>
              <span className="truncate">{project.title}</span>
            </div>
            {project.company && (
              <div className="mt-1 truncate text-xs text-gray-500">
                {project.company}
              </div>
            )}
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="rounded p-1 opacity-0 hover:bg-gray-200 group-hover:opacity-100"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
        </div>
      </button>

      {/* Context Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
            <button
              onClick={handleRename}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Rename
            </button>
            <button
              onClick={handleDuplicate}
              disabled={duplicateMutation.isPending}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Duplicate
            </button>
            <div className="my-1 border-t border-gray-200" />
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

