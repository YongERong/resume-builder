'use client';

import { api } from '~/trpc/react';
import type { Experience } from '@prisma/client';

interface ExperienceCardProps {
  experience: Experience;
  onEdit: () => void;
}

export function ExperienceCard({ experience, onEdit }: ExperienceCardProps) {
  const utils = api.useUtils();
  
  const deleteMutation = api.experience.delete.useMutation({
    onSuccess: () => {
      void utils.experience.list.invalidate();
    },
  });

  const duplicateMutation = api.experience.create.useMutation({
    onSuccess: () => {
      void utils.experience.list.invalidate();
    },
  });

  const handleDelete = () => {
    if (confirm(`Delete "${experience.title}"?`)) {
      deleteMutation.mutate({ id: experience.id });
    }
  };

  const handleDuplicate = () => {
    duplicateMutation.mutate({
      types: experience.types,
      title: `${experience.title} (Copy)`,
      company: experience.company ?? undefined,
      dateRange: experience.dateRange ?? undefined,
      bullets: experience.bullets as string[],
      tags: experience.tags,
      keywords: experience.keywords,
    });
  };

  const typeLabels: Record<string, string> = {
    work: 'Work',
    internship: 'Internship',
    education: 'Education',
    exchange: 'Exchange',
    academic_project: 'Project',
    leadership: 'Leadership',
    volunteer: 'Volunteer',
    club: 'Club',
    competition: 'Competition',
    technical_skills: 'Skills',
    language_skills: 'Language',
    certifications: 'Cert',
    interests: 'Interest',
    hobbies: 'Hobby',
    sports: 'Sport',
    personal: 'Personal',
  };

  const bullets = Array.isArray(experience.bullets) ? experience.bullets : [];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{experience.title}</h3>
              {experience.company && (
                <p className="text-sm text-gray-600">{experience.company}</p>
              )}
              {experience.dateRange && (
                <p className="text-sm text-gray-500">{experience.dateRange}</p>
              )}
              {/* Show type badges */}
              {experience.types && experience.types.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {experience.types.map((type) => (
                    <span
                      key={type}
                      className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                    >
                      {typeLabels[type] || type}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {bullets.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              {bullets.slice(0, 2).map((bullet, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-gray-400">•</span>
                  <span className="flex-1">{bullet}</span>
                </li>
              ))}
              {bullets.length > 2 && (
                <li className="text-gray-500">+ {bullets.length - 2} more bullets</li>
              )}
            </ul>
          )}

          {experience.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {experience.tags.slice(0, 5).map((tag, idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
                >
                  {tag}
                </span>
              ))}
              {experience.tags.length > 5 && (
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                  +{experience.tags.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onEdit}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
            title="Edit"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={handleDuplicate}
            disabled={duplicateMutation.isPending}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            title="Duplicate"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
            title="Delete"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

