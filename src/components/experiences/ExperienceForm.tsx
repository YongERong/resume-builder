'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import { BulletEditor } from './BulletEditor';
import type { Experience, ExperienceType } from '@prisma/client';

interface ExperienceFormProps {
  experience?: Experience;
  onClose: () => void;
}

export function ExperienceForm({ experience, onClose }: ExperienceFormProps) {
  const utils = api.useUtils();
  const isEditing = !!experience;

  const [formData, setFormData] = useState({
    types: (experience?.types ?? ['work']) as ExperienceType[],
    title: experience?.title ?? '',
    company: experience?.company ?? '',
    dateRange: experience?.dateRange ?? '',
    bullets: (experience?.bullets as string[]) ?? [''],
    tags: experience?.tags ?? [],
    keywords: experience?.keywords ?? [],
  });

  const [tagInput, setTagInput] = useState('');

  const createMutation = api.experience.create.useMutation({
    onSuccess: () => {
      void utils.experience.list.invalidate();
      onClose();
    },
  });

  const updateMutation = api.experience.update.useMutation({
    onSuccess: () => {
      void utils.experience.list.invalidate();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Filter out empty bullets
    const bullets = formData.bullets.filter((b) => b.trim() !== '');

    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (bullets.length === 0) {
      alert('Please add at least one bullet point');
      return;
    }

    if (formData.types.length === 0) {
      alert('Please select at least one type');
      return;
    }

    const data = {
      types: formData.types,
      title: formData.title.trim(),
      company: formData.company.trim() || undefined,
      dateRange: formData.dateRange.trim() || undefined,
      bullets,
      tags: formData.tags,
      keywords: formData.keywords,
    };

    if (isEditing) {
      updateMutation.mutate({ id: experience.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Experience' : 'Create New Experience'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Types <span className="text-red-500">*</span>
              </label>
              <p className="mb-2 text-xs text-gray-500">
                Select one or more types. This allows the experience to appear in multiple sections.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3 rounded-md border border-gray-300 p-4">
                {[
                  { value: 'work', label: 'Work Experience' },
                  { value: 'internship', label: 'Internship' },
                  { value: 'education', label: 'Education' },
                  { value: 'exchange', label: 'Exchange Program' },
                  { value: 'academic_project', label: 'Academic Project' },
                  { value: 'leadership', label: 'Leadership' },
                  { value: 'volunteer', label: 'Volunteer' },
                  { value: 'club', label: 'Club/Organization' },
                  { value: 'competition', label: 'Competition' },
                  { value: 'technical_skills', label: 'Technical Skills' },
                  { value: 'language_skills', label: 'Language Skills' },
                  { value: 'certifications', label: 'Certifications' },
                  { value: 'interests', label: 'Interests' },
                  { value: 'hobbies', label: 'Hobbies' },
                  { value: 'sports', label: 'Sports' },
                  { value: 'personal', label: 'Personal' },
                ].map(({ value, label }) => (
                  <label key={value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.types.includes(value as ExperienceType)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, types: [...formData.types, value as ExperienceType] });
                        } else {
                          setFormData({ ...formData, types: formData.types.filter(t => t !== value) });
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Software Engineering Intern"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Company / Institution
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="e.g., Google"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date Range
              </label>
              <input
                type="text"
                value={formData.dateRange}
                onChange={(e) => setFormData({ ...formData, dateRange: e.target.value })}
                placeholder="e.g., Jan 2023 - Jun 2023"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Bullet Points */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Bullet Points <span className="text-red-500">*</span>
              </label>
              <p className="mb-2 text-xs text-gray-500">
                Add 3-4 bullet points describing your experience. Start with action verbs and include quantifiable results.
              </p>
              <BulletEditor
                bullets={formData.bullets}
                onChange={(bullets) => setFormData({ ...formData, bullets })}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tags
              </label>
              <p className="mb-2 text-xs text-gray-500">
                Add tags to help categorize and search for this experience
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="e.g., python, machine-learning"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Add
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="rounded-full hover:bg-blue-200"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Experience'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

