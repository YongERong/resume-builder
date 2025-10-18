'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '~/trpc/react';
import { ProjectSidebar } from '~/components/sidebar/ProjectSidebar';
import { ExperienceForm } from '~/components/experiences/ExperienceForm';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ProjectWorkspacePage() {
  const params = useParams();
  const projectId = params.id as string;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  
  const { data: project, isLoading } = api.project.get.useQuery({ id: projectId });
  const { data: profile } = api.profile.get.useQuery();
  const { data: experiences = [] } = api.experience.list.useQuery();

  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingExperience, setEditingExperience] = useState<any>(null);
  const [editingForResume, setEditingForResume] = useState<{ sectionId: string; item: any } | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [droppedItems, setDroppedItems] = useState<Record<string, any[]>>(
    project?.resume?.content as Record<string, any[]> ?? {
      header: [],
      education: [],
      academic_project: [],
      internship: [],
      work: [],
      leadership: [],
      technical_skills: [],
      interests: [],
    }
  );

  const [jobUrl, setJobUrl] = useState(project?.jobUrl ?? '');
  const [jobDescription, setJobDescription] = useState(
    project?.jobAnalysis?.jobDescription ?? ''
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jobName, setJobName] = useState<string | null>(
    project?.jobAnalysis?.jobName ?? null
  );
  const [companyName, setCompanyName] = useState<string | null>(
    project?.jobAnalysis?.companyName ?? null
  );
  const [companyWebsite, setCompanyWebsite] = useState<string | null>(
    project?.jobAnalysis?.companyWebsite ?? null
  );
  const [jobScope, setJobScope] = useState<string | null>(
    project?.jobAnalysis?.jobScope ?? null
  );
  const [skills, setSkills] = useState<string[]>(
    project?.jobAnalysis?.skills ?? []
  );
  const [values, setValues] = useState<string[]>(
    project?.jobAnalysis?.values ?? []
  );
  const [jobKeywords, setJobKeywords] = useState<string[]>(
    project?.jobAnalysis?.keywords ?? []
  );
  const [recruiterNotes, setRecruiterNotes] = useState<string | null>(
    project?.jobAnalysis?.recruiterNotes ?? null
  );

  const updateResumeMutation = api.resume.update.useMutation();
  const analyzeJobMutation = api.jobAnalysis.analyze.useMutation();

  // Mapping of section IDs to their allowed experience types
  const sectionTypeMap: Record<string, string[]> = {
    header: [],
    education: ['education', 'exchange'],
    academic_project: ['academic_project'],
    internship: ['internship'],
    work: ['work'],
    leadership: ['leadership', 'volunteer', 'club', 'competition'],
    technical_skills: ['technical_skills', 'language_skills', 'certifications'],
    interests: ['interests', 'hobbies', 'sports', 'personal'],
  };

  const sections = [
    { id: 'header', title: 'HEADER', description: 'Contact information and personal details' },
    { id: 'education', title: 'EDUCATION', description: 'Academic qualifications and achievements' },
    { id: 'academic_project', title: 'ACADEMIC PROJECT', description: 'Academic projects, FYP, coursework' },
    { id: 'internship', title: 'INTERNSHIP EXPERIENCE', description: 'Internship and training experiences' },
    { id: 'work', title: 'WORK EXPERIENCE', description: 'Full-time and part-time work history' },
    { id: 'leadership', title: 'CO-CURRICULAR ACTIVITIES', description: 'Leadership roles and extracurricular activities' },
    { id: 'technical_skills', title: 'SKILLS', description: 'Technical skills, languages, and competencies' },
    { id: 'interests', title: 'HOBBIES & INTERESTS', description: 'Personal interests and hobbies' },
  ];

  const openModal = (sectionId: string) => {
    setSelectedSection(sectionId);
    setSearchQuery(''); // Reset search when opening modal
  };

  // Filter experiences based on search query AND section type
  const filteredExperiences = experiences.filter((exp: any) => {
    // Filter by section type first
    if (selectedSection && sectionTypeMap[selectedSection]) {
      const allowedTypes = sectionTypeMap[selectedSection];
      const hasMatchingType = exp.types?.some((type: string) => allowedTypes.includes(type));
      if (!hasMatchingType) return false;
    }
    
    // Then filter by search query
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const titleMatch = exp.title?.toLowerCase().includes(query);
    const companyMatch = exp.company?.toLowerCase().includes(query);
    const tagsMatch = exp.tags?.some((tag: string) => tag.toLowerCase().includes(query));
    const keywordsMatch = exp.keywords?.some((keyword: string) => keyword.toLowerCase().includes(query));
    
    return titleMatch || companyMatch || tagsMatch || keywordsMatch;
  });

  // Check if an experience is already used in any section
  const isExperienceUsed = (experienceId: string): boolean => {
    return Object.values(droppedItems).some((items) =>
      items.some((item: any) => item.id === experienceId)
    );
  };

  const addToSection = (experienceId: string) => {
    const experience = experiences.find((exp: { id: string }) => exp.id === experienceId);
    
    // Prevent duplicate additions
    if (isExperienceUsed(experienceId)) {
      alert('This experience is already added to your resume.');
      return;
    }
    
    if (experience && selectedSection) {
      const newDroppedItems = {
        ...droppedItems,
        [selectedSection]: [...(droppedItems[selectedSection] ?? []), experience],
      };
      setDroppedItems(newDroppedItems);
      setSelectedSection(null);

      // Auto-save to backend
      if (project?.resume) {
        updateResumeMutation.mutate({
          id: project.resume.id,
          content: newDroppedItems,
        });
      }
    }
  };

  const removeFromSection = (sectionId: string, experienceId: string) => {
    const newDroppedItems = {
      ...droppedItems,
      [sectionId]: (droppedItems[sectionId] ?? []).filter((item: any) => item.id !== experienceId),
    };
    setDroppedItems(newDroppedItems);

    // Auto-save to backend
    if (project?.resume) {
      updateResumeMutation.mutate({
        id: project.resume.id,
        content: newDroppedItems,
      });
    }
  };

  const analyzeJob = async () => {
    if (!jobUrl && !jobDescription) {
      alert('Please enter a job URL or paste the job description');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeJobMutation.mutateAsync({
        jobUrl: jobUrl || undefined,
        jobDescription: jobDescription || undefined,
        projectId: projectId,
      });

      // Update state with extracted information
      console.log('📊 Job analysis result:', {
        jobName: result.jobName,
        companyName: result.companyName,
        companyWebsite: result.companyWebsite,
        skillsCount: result.skills?.length || 0,
        valuesCount: result.values?.length || 0,
        keywordsCount: result.keywords?.length || 0,
      });
      
      setJobName(result.jobName);
      setCompanyName(result.companyName);
      setCompanyWebsite(result.companyWebsite);
      setJobScope(result.jobScope);
      setJobDescription(result.jobDescription);
      setSkills(result.skills || []);
      setValues(result.values || []);
      setJobKeywords(result.keywords || []);
      setRecruiterNotes(result.recruiterNotes);
    } catch (error: any) {
      console.error('Job analysis failed:', error);
      alert(error.message || 'Failed to analyze job. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const calculateProgress = () => {
    const totalSections = sections.length - 1;
    const filledSections = sections.filter(
      (section) => section.id !== 'header' && (droppedItems[section.id] ?? []).length > 0
    ).length;
    return Math.round((filledSections / totalSections) * 100);
  };

  const getTotalItems = () => {
    return Object.values(droppedItems).flat().length;
  };

  // Check if a skill/value/keyword appears in the resume content
  const isTagFulfilled = (tag: string): boolean => {
    const searchTerm = tag.toLowerCase();
    
    // Get all resume content as text
    const allContent = Object.values(droppedItems)
      .flat()
      .map((item: any) => {
        const parts = [
          item.title,
          item.company,
          item.description,
          ...(item.bullets || []),
          ...(item.customBullets || []),
          ...(item.tags || []),
          ...(item.keywords || []),
        ].filter(Boolean);
        return parts.join(' ').toLowerCase();
      })
      .join(' ');
    
    return allContent.includes(searchTerm);
  };

  // Export PDF function using jsPDF and html2canvas
  const exportPDF = async () => {
    const element = document.querySelector('.print-content') as HTMLElement;
    if (!element) {
      console.error('Print content element not found');
      alert('Failed to generate PDF. Please try again.');
      return;
    }

    try {
      console.log('Starting PDF generation...');
      console.log('Original element dimensions:', element.offsetWidth, 'x', element.offsetHeight);
      
      // Clone the element to avoid modifying the original
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      
      // Ensure clone has exact same dimensions as original
      clone.style.width = '8.5in';
      clone.style.minHeight = '11in';
      clone.style.padding = '48px'; // p-12 = 48px
      clone.style.backgroundColor = '#ffffff';
      
      document.body.appendChild(clone);
      
      // Force all colors to safe hex values recursively
      const forceHexColors = (el: HTMLElement) => {
        // Get computed styles to preserve layout and formatting
        const computed = window.getComputedStyle(el);
        
        // Preserve all layout and formatting (but use safe colors)
        el.style.display = computed.display;
        el.style.fontSize = computed.fontSize;
        el.style.fontWeight = computed.fontWeight;
        el.style.fontStyle = computed.fontStyle;
        el.style.fontFamily = computed.fontFamily;
        el.style.textAlign = computed.textAlign;
        el.style.lineHeight = computed.lineHeight;
        el.style.letterSpacing = computed.letterSpacing;
        el.style.textDecoration = computed.textDecoration;
        el.style.textTransform = computed.textTransform;
        
        // Spacing
        el.style.padding = computed.padding;
        el.style.margin = computed.margin;
        el.style.gap = computed.gap;
        
        // Borders (preserve style and width, but use safe color)
        el.style.borderStyle = computed.borderStyle;
        el.style.borderWidth = computed.borderWidth;
        el.style.borderRadius = computed.borderRadius;
        el.style.borderColor = '#000000'; // Force black borders
        
        // Layout
        el.style.width = computed.width;
        el.style.maxWidth = computed.maxWidth;
        el.style.flexDirection = computed.flexDirection;
        el.style.flexWrap = computed.flexWrap;
        el.style.alignItems = computed.alignItems;
        el.style.justifyContent = computed.justifyContent;
        
        // List styling - preserve EXACTLY as rendered
        if (el.tagName === 'UL' || el.tagName === 'OL') {
          el.style.listStyleType = 'disc'; // Force disc bullets
          el.style.listStylePosition = 'outside'; // Standard position
          el.style.paddingLeft = '1.25rem'; // pl-5 = 1.25rem = 20px
          el.style.marginTop = '0.25rem'; // mt-1
          el.style.marginBottom = '0';
        }
        
        // List item styling - critical for bullet alignment
        if (el.tagName === 'LI') {
          el.style.display = 'list-item'; // Critical!
          el.style.listStyleType = 'disc'; // Force disc bullets
          el.style.listStylePosition = 'outside';
          el.style.paddingLeft = '0';
          el.style.marginLeft = '0';
          el.style.marginBottom = '0.125rem'; // space-y-0.5
        }
        
        // Override colors with safe hex values
        const currentColor = computed.color;
        const currentBg = computed.backgroundColor;
        
        // Determine safe color based on current computed color
        if (currentColor && currentColor !== 'rgba(0, 0, 0, 0)' && currentColor !== 'transparent') {
          // If it's a light color, keep it light gray; if dark, keep it dark
          const rgb = currentColor.match(/\d+/g);
          if (rgb && rgb.length >= 3 && rgb[0] && rgb[1] && rgb[2]) {
            const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
            el.style.color = brightness > 128 ? '#6b7280' : '#1f2937'; // light gray or dark gray
          } else {
            el.style.color = '#1f2937';
          }
        }
        
        // Background color
        if (currentBg && currentBg !== 'rgba(0, 0, 0, 0)' && currentBg !== 'transparent') {
          const rgb = currentBg.match(/\d+/g);
          if (rgb && rgb.length >= 3 && rgb[0] && rgb[1] && rgb[2]) {
            const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
            el.style.backgroundColor = brightness > 200 ? '#f9fafb' : '#ffffff'; // very light gray or white
          } else {
            el.style.backgroundColor = '#ffffff';
          }
        }
        
        // Remove all CSS classes to avoid Tailwind's lab() colors
        el.className = '';
        
        // Recursively apply to all children
        Array.from(el.children).forEach(child => {
          if (child instanceof HTMLElement) {
            forceHexColors(child);
          }
        });
      };
      
      // Apply color fixes
      forceHexColors(clone);
      
      // Wait for fonts and layout to settle
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('Capturing canvas...');
      console.log('Clone dimensions:', clone.offsetWidth, 'x', clone.offsetHeight);
      
      // Capture with exact dimensions matching US Letter (8.5" x 11")
      const canvas = await html2canvas(clone, {
        scale: 2, // 2x for high quality
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: clone.offsetWidth,
        height: clone.offsetHeight,
        windowWidth: clone.offsetWidth,
        windowHeight: clone.offsetHeight,
      });

      // Remove clone
      document.body.removeChild(clone);

      console.log('Canvas captured:', canvas.width, 'x', canvas.height);

      // Use US Letter size (8.5" x 11") to match preview
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter', // 8.5" x 11"
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // Calculate dimensions to fit on letter-sized page
      const pdfWidth = 8.5; // inches
      const pdfHeight = 11; // inches
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      console.log(`PDF dimensions: ${pdfWidth}" x ${pdfHeight}", Image: ${imgWidth}" x ${imgHeight}"`);
      
      // If content fits on one page, just add it
      if (imgHeight <= pdfHeight) {
        console.log('Content fits on one page!');
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      } else {
        // Content spans multiple pages - split it properly
        console.log(`Content needs ${Math.ceil(imgHeight / pdfHeight)} pages`);
        
        let heightLeft = imgHeight;
        let position = 0;
        
        // Add first page
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
        
        // Add additional pages
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
        }
      }
      
      // Download PDF
      const fileName = `${project?.title || 'Resume'}_${new Date().toISOString().split('T')[0]}.pdf`;
      console.log('Saving PDF as:', fileName);
      pdf.save(fileName);
      
      console.log('✅ PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-red-600">Project not found</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Project Sidebar */}
      <ProjectSidebar
        currentProjectId={projectId}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  {project.title}
                </h1>
                {project.company && (
                  <p className="mt-1 text-sm text-gray-600">{project.company}</p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {profile?.name || 'User'}
                </span>
                <button 
                  onClick={() => setShowPdfPreview(true)}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                >
                  Preview PDF
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Resume Sections */}
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section.id} className="rounded-lg bg-white p-6 shadow">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                  <p className="text-sm text-gray-600">{section.description}</p>
                </div>

                <div className="space-y-4">
                  {(droppedItems[section.id] ?? []).length === 0 ? (
                    <button
                      onClick={() => openModal(section.id)}
                      className="w-full rounded-md border-2 border-dashed border-gray-300 px-6 py-8 text-center hover:border-gray-400"
                    >
                      <span className="text-sm text-gray-600">
                        Tap to add {section.title.toLowerCase()}
                      </span>
                    </button>
                  ) : (
                    <>
                      {(droppedItems[section.id] ?? []).map((item: any) => (
                        <div
                          key={item.id}
                          className="relative rounded-md border border-gray-200 bg-gray-50 p-4"
                        >
                          <div className="absolute right-2 top-2 flex gap-1">
                            <button
                              onClick={() => {
                                setEditingForResume({ sectionId: section.id, item });
                              }}
                              className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-blue-600"
                              title="Edit description for this resume"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => removeFromSection(section.id, item.id)}
                              className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600"
                              title="Remove from resume"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <h4 className="pr-20 font-semibold text-gray-900">{item.title}</h4>
                          {item.company && (
                            <p className="text-sm text-gray-600">{item.company}</p>
                          )}
                          {item.dateRange && (
                            <p className="text-sm text-gray-600">{item.dateRange}</p>
                          )}
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-gray-700">
                            {(item.customBullets ?? item.bullets as string[]).map((bullet: string, idx: number) => (
                              <li key={idx}>{bullet}</li>
                            ))}
                          </ul>
                          {item.customBullets && (
                            <p className="mt-2 text-xs italic text-blue-600">
                              ✏️ Customized for this resume
                            </p>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => openModal(section.id)}
                        className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        + Add another
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Right Sidebar */}
      {!rightPanelCollapsed && (
        <aside className="w-96 overflow-auto border-l border-gray-200 bg-white">
          <div className="space-y-6 p-6">
            {/* Job Analysis Section */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                <i className="fas fa-briefcase mr-2"></i>
                Job Analysis
              </h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="jobUrl" className="mb-1 block text-sm font-medium text-gray-700">
                    Job Listing URL
                  </label>
                  <input
                    type="url"
                    id="jobUrl"
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    disabled={isAnalyzing}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label htmlFor="jobDescription" className="mb-1 block text-sm font-medium text-gray-700">
                    Job Description
                  </label>
                  <div className="relative">
                    <textarea
                      id="jobDescription"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      disabled={isAnalyzing}
                      rows={8}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Paste job description here or it will be auto-filled from URL..."
                    />
                    {isAnalyzing && (
                      <div className="absolute inset-0 rounded-md bg-gray-100 bg-opacity-90">
                        <div className="flex h-full flex-col gap-2 p-3">
                          <div className="h-3 animate-pulse rounded bg-gray-300"></div>
                          <div className="h-3 animate-pulse rounded bg-gray-300" style={{ animationDelay: '0.1s' }}></div>
                          <div className="h-3 animate-pulse rounded bg-gray-300" style={{ animationDelay: '0.2s' }}></div>
                          <div className="h-3 w-4/5 animate-pulse rounded bg-gray-300" style={{ animationDelay: '0.3s' }}></div>
                          <div className="h-3 animate-pulse rounded bg-gray-300" style={{ animationDelay: '0.4s' }}></div>
                          <div className="h-3 w-3/4 animate-pulse rounded bg-gray-300" style={{ animationDelay: '0.5s' }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Optional: Add additional context or paste the full description
                  </p>
                </div>

                <button
                  onClick={analyzeJob}
                  disabled={isAnalyzing || (!jobUrl && !jobDescription)}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </span>
                  ) : (
                    jobName ? 'Re-analyze Job' : 'Analyze Job'
                  )}
                </button>
                {jobName && (
                  <p className="text-xs text-gray-500 italic">
                    💡 Re-analyzing will update the current job analysis
                  </p>
                )}

                {/* Warning when analysis returns no meaningful data */}
                {jobDescription && !jobName && !companyName && skills.length === 0 && (
                  <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
                    <div className="flex gap-2">
                      <svg className="h-5 w-5 flex-shrink-0 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="text-sm">
                        <p className="font-medium text-yellow-800">Limited data extracted</p>
                        <p className="mt-1 text-yellow-700">
                          The scraped content may not contain the full job posting. Try copying and pasting the actual job description into the textarea above for better results.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Job Name & Company */}
                {(jobName || companyName) && (
                  <div className="rounded-md border border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                    {jobName && (
                      <h3 className="text-base font-semibold text-gray-900">{jobName}</h3>
                    )}
                    {companyName && (
                      <p className="mt-1 flex items-center gap-2 text-sm text-gray-700">
                        <span className="font-medium">{companyName}</span>
                        {companyWebsite && (
                          <a
                            href={companyWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            title="Visit company website"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </p>
                    )}
                    {jobScope && (
                      <p className="mt-2 text-xs leading-relaxed text-gray-600">{jobScope}</p>
                    )}
                  </div>
                )}

                {/* Skills */}
                {skills.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-gray-900">Required Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill, idx) => {
                        const isFulfilled = isTagFulfilled(skill);
                        return (
                          <span
                            key={idx}
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                              isFulfilled
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {isFulfilled && (
                              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                            {skill}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Values */}
                {values.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-gray-900">Company Values</h4>
                    <div className="flex flex-wrap gap-2">
                      {values.map((value, idx) => {
                        const isFulfilled = isTagFulfilled(value);
                        return (
                          <span
                            key={idx}
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                              isFulfilled
                                ? 'bg-green-600 text-white shadow-md'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {isFulfilled && (
                              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                            {value}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Keywords */}
                {jobKeywords.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-gray-900">ATS Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {jobKeywords.map((keyword, idx) => {
                        const isFulfilled = isTagFulfilled(keyword);
                        return (
                          <span
                            key={idx}
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                              isFulfilled
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {isFulfilled && (
                              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                            {keyword}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recruiter Notes */}
                {recruiterNotes && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-gray-900">What They're Looking For</h4>
                    <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-line">
                      {recruiterNotes}
                    </div>
                  </div>
                )}

                {/* Job Description (collapsible) */}
                {jobDescription && (
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                      Raw Job Data
                    </summary>
                    <div className="mt-2 max-h-64 overflow-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                      {jobDescription}
                    </div>
                  </details>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                <i className="fas fa-check-circle mr-2"></i>
                Quality Control
              </h2>

              {/* ATS Check */}
              <div className="mb-4 rounded-md border border-gray-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">ATS Check</span>
                  <span className={`text-sm font-medium ${getTotalItems() >= 5 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {getTotalItems() >= 5 ? 'Passed' : 'Needs More Content'}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  {getTotalItems() === 0
                    ? 'Add content to resume to run compatibility check'
                    : getTotalItems() < 5
                    ? 'Add more sections for better ATS compatibility'
                    : 'Resume format is ATS-compatible'}
                </p>
              </div>

              {/* Length Check */}
              <div className="mb-4 rounded-md border border-gray-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Length Check</span>
                  <span className="text-sm font-medium text-green-600">Optimal</span>
                </div>
                <p className="text-xs text-gray-600">
                  Current length: {Math.max(1, Math.ceil(getTotalItems() / 8))} page(s) | Target: 1-2 pages
                </p>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Completion Progress</span>
                  <span className="text-sm font-medium text-gray-600">{calculateProgress()}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-600 transition-all"
                    style={{ width: `${calculateProgress()}%` }}
                  />
                </div>
              </div>

              {/* Preview Button */}
              <button
                onClick={() => setShowPdfPreview(true)}
                disabled={calculateProgress() < 50}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="mr-2 inline-block h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview PDF
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Selection Modal */}
      {selectedSection && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black opacity-30"
              onClick={() => setSelectedSection(null)}
            />
            <div className="relative z-10 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <h3 className="mb-4 text-lg font-semibold">
                Add to {sections.find((s) => s.id === selectedSection)?.title ?? 'Section'}
              </h3>

              {/* Search Input */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search experiences by title, company, or skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  <svg
                    className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-96 space-y-4 overflow-y-auto">
                {experiences.length === 0 ? (
                  <p className="text-center text-sm text-gray-500">
                    No experiences found. Add some experiences first.
                  </p>
                ) : filteredExperiences.length === 0 ? (
                  <div className="py-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">
                      No experiences match &quot;{searchQuery}&quot;
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-500"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <>
                    {searchQuery && (
                      <p className="text-xs text-gray-500">
                        Found {filteredExperiences.length} {filteredExperiences.length === 1 ? 'experience' : 'experiences'}
                      </p>
                    )}
                    {filteredExperiences.map((exp: { id: string; title: string; company: string | null; tags: string[] }) => {
                      const alreadyUsed = isExperienceUsed(exp.id);
                      return (
                        <button
                          key={exp.id}
                          onClick={() => addToSection(exp.id)}
                          disabled={alreadyUsed}
                          className={`w-full rounded-md border p-4 text-left transition-all ${
                            alreadyUsed
                              ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
                              : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{exp.title}</h4>
                              {exp.company && (
                                <p className="text-sm text-gray-600">{exp.company}</p>
                              )}
                              <div className="mt-2 flex flex-wrap gap-2">
                                {exp.tags.slice(0, 3).map((tag: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {alreadyUsed && (
                              <span className="ml-3 flex-shrink-0 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                                ✓ Added
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedSection(null)}
                  className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Experience Modal */}
      {editingExperience && (
        <ExperienceForm
          experience={editingExperience}
          onClose={() => setEditingExperience(null)}
        />
      )}

      {/* Edit Resume-Specific Description Modal */}
      {editingForResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Edit Description for This Resume
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Changes will only apply to this resume, not the original experience
                </p>
              </div>
              <button
                onClick={() => setEditingForResume(null)}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const bullets = formData.getAll('bullet').filter((b) => b.toString().trim() !== '') as string[];
                
                if (bullets.length === 0) {
                  alert('Please add at least one bullet point');
                  return;
                }

                // Update the item with custom bullets
                const updatedDroppedItems = {
                  ...droppedItems,
                  [editingForResume.sectionId]: (droppedItems[editingForResume.sectionId] ?? []).map((item: any) =>
                    item.id === editingForResume.item.id
                      ? { ...item, customBullets: bullets }
                      : item
                  ),
                };
                setDroppedItems(updatedDroppedItems);

                // Auto-save to backend
                if (project?.resume) {
                  updateResumeMutation.mutate({
                    id: project.resume.id,
                    content: updatedDroppedItems,
                  });
                }

                setEditingForResume(null);
              }}
              className="max-h-[70vh] overflow-y-auto p-6"
            >
              <div className="space-y-4">
                <div className="rounded-md bg-gray-50 p-4">
                  <h3 className="font-semibold text-gray-900">{editingForResume.item.title}</h3>
                  {editingForResume.item.company && (
                    <p className="text-sm text-gray-600">{editingForResume.item.company}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Custom Bullet Points <span className="text-red-500">*</span>
                  </label>
                  <p className="mb-2 text-xs text-gray-500">
                    Edit these bullets to tailor them for this specific resume
                  </p>
                  
                  <div className="space-y-3">
                    {(editingForResume.item.customBullets ?? editingForResume.item.bullets).map((bullet: string, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <textarea
                          name="bullet"
                          defaultValue={bullet}
                          rows={2}
                          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Start with an action verb..."
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            const textarea = e.currentTarget.previousElementSibling as HTMLTextAreaElement;
                            if (textarea) {
                              textarea.value = '';
                              textarea.style.display = 'none';
                            }
                          }}
                          className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const container = document.querySelector('[name="bullet"]')?.parentElement?.parentElement;
                      if (container) {
                        const newTextarea = document.createElement('div');
                        newTextarea.className = 'flex gap-2';
                        newTextarea.innerHTML = `
                          <textarea
                            name="bullet"
                            rows="2"
                            class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Start with an action verb..."
                          ></textarea>
                        `;
                        container.appendChild(newTextarea);
                      }
                    }}
                    className="mt-3 w-full rounded-md border-2 border-dashed border-gray-300 py-2 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                  >
                    + Add Bullet Point
                  </button>
                </div>

                <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> Customize these bullets to highlight skills and achievements relevant to this specific job application. The original experience in your library will remain unchanged.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 flex justify-between border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    // Reset to original bullets
                    const updatedDroppedItems = {
                      ...droppedItems,
                      [editingForResume.sectionId]: (droppedItems[editingForResume.sectionId] ?? []).map((item: any) =>
                        item.id === editingForResume.item.id
                          ? { ...item, customBullets: undefined }
                          : item
                      ),
                    };
                    setDroppedItems(updatedDroppedItems);

                    if (project?.resume) {
                      updateResumeMutation.mutate({
                        id: project.resume.id,
                        content: updatedDroppedItems,
                      });
                    }

                    setEditingForResume(null);
                  }}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Reset to Original
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingForResume(null)}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPdfPreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-75">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-5xl rounded-lg bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Resume Preview</h2>
                  <p className="text-sm text-gray-600">{project.title}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={exportPDF}
                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </button>
                  <button
                    onClick={() => setShowPdfPreview(false)}
                    className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* PDF Content */}
              <div className="max-h-[80vh] overflow-auto bg-gray-100 p-8">
                <div className="print-content mx-auto bg-white p-12 shadow-lg" style={{ width: '8.5in', minHeight: '11in' }}>
                  {/* Header Section */}
                  <div className="mb-6 border-b-2 border-gray-800 pb-4">
                    <h1 className="text-3xl font-bold text-gray-900">
                      {profile?.name || 'Your Name'}
                    </h1>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-700">
                      {profile?.email && <span>{profile.email}</span>}
                      {profile?.mobile && <span>• {profile.mobile}</span>}
                      {profile?.linkedin && (
                        <span>
                          • <a href={profile.linkedin} className="text-blue-600 no-underline">{profile.linkedin}</a>
                        </span>
                      )}
                      {profile?.portfolio && (
                        <span>
                          • <a href={profile.portfolio} className="text-blue-600 no-underline">{profile.portfolio}</a>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Resume Sections */}
                  {sections.map((section) => {
                    const items = droppedItems[section.id] ?? [];
                    if (items.length === 0 || section.id === 'header') return null;

                    return (
                      <div key={section.id} className="mb-5" style={{ pageBreakInside: 'avoid' }}>
                        <h2 className="mb-2 border-b border-gray-400 pb-1 text-base font-bold uppercase tracking-wide text-gray-900">
                          {section.title}
                        </h2>
                        <div className="space-y-3">
                          {items.map((item: any) => (
                            <div key={item.id} className="text-sm" style={{ pageBreakInside: 'avoid' }}>
                              <div className="flex items-baseline justify-between">
                                <h3 className="font-bold text-gray-900">{item.title}</h3>
                                {item.dateRange && (
                                  <span className="text-xs italic text-gray-600">{item.dateRange}</span>
                                )}
                              </div>
                              {item.company && (
                                <p className="italic text-gray-700">{item.company}</p>
                              )}
                              {(item.customBullets ?? item.bullets).length > 0 && (
                                <ul className="mt-1 list-disc space-y-0.5 pl-5" style={{ textAlign: 'justify' }}>
                                  {(item.customBullets ?? item.bullets).map((bullet: string, idx: number) => (
                                    <li key={idx} className="text-gray-800 leading-relaxed">
                                      {bullet}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

