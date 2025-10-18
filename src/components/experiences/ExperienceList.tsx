'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import { ExperienceCard } from './ExperienceCard';
import { ExperienceForm } from './ExperienceForm';
import type { ExperienceType } from '@prisma/client';

export function ExperienceList() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<ExperienceType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: experiences = [], isLoading } = api.experience.list.useQuery({
    type: filterType === 'all' ? undefined : filterType,
  });

  const filteredExperiences = searchQuery
    ? experiences.filter((exp) =>
        [exp.title, exp.company ?? '', ...exp.tags, ...exp.keywords]
          .join(' ')
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
    : experiences;

  // Group experiences by type (experiences can appear in multiple groups)
  const groupedExperiences = filteredExperiences.reduce((acc, exp) => {
    // Each experience can have multiple types
    exp.types?.forEach((type) => {
      if (!acc[type]) {
        acc[type] = [];
      }
      // Only add if not already in this group
      if (!acc[type].some((e) => e.id === exp.id)) {
        acc[type].push(exp);
      }
    });
    return acc;
  }, {} as Record<string, typeof experiences>);

  const typeLabels: Record<string, string> = {
    work: 'Work Experience',
    internship: 'Internship Experience',
    education: 'Education',
    exchange: 'Exchange Programs',
    academic_project: 'Academic Projects',
    leadership: 'Leadership',
    volunteer: 'Volunteer Work',
    club: 'Clubs & Organizations',
    competition: 'Competitions',
    technical_skills: 'Technical Skills',
    language_skills: 'Language Skills',
    certifications: 'Certifications',
    interests: 'Interests',
    hobbies: 'Hobbies',
    sports: 'Sports',
    personal: 'Personal',
  };

  const editingExperience = experiences.find((exp) => exp.id === editingId);

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Experience Library</h1>
          <p className="mt-1 text-gray-600">
            Manage your experiences to build tailored resumes
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          + Create Experience
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search by title, company, skills..."
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as ExperienceType | 'all')}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="work">Work</option>
          <option value="internship">Internship</option>
          <option value="education">Education</option>
          <option value="academic_project">Projects</option>
          <option value="leadership">Leadership</option>
          <option value="technical_skills">Skills</option>
          <option value="interests">Interests</option>
        </select>
      </div>

      {/* Experience List */}
      {isLoading ? (
        <div className="text-center text-gray-500">Loading experiences...</div>
      ) : filteredExperiences.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">No experiences</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery ? 'No experiences match your search' : 'Get started by creating your first experience'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsCreating(true)}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              + Create Experience
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedExperiences).map(([type, exps]) => (
            <div key={type}>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                {typeLabels[type]} ({exps.length})
              </h2>
              <div className="space-y-3">
                {exps.map((exp) => (
                  <ExperienceCard
                    key={exp.id}
                    experience={exp}
                    onEdit={() => setEditingId(exp.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isCreating || editingId) && (
        <ExperienceForm
          experience={editingExperience}
          onClose={() => {
            setIsCreating(false);
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}

