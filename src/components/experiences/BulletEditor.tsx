'use client';

interface BulletEditorProps {
  bullets: string[];
  onChange: (bullets: string[]) => void;
}

const actionVerbs = [
  'Achieved', 'Analyzed', 'Built', 'Collaborated', 'Created', 'Delivered', 'Designed',
  'Developed', 'Engineered', 'Enhanced', 'Established', 'Executed', 'Generated', 'Implemented',
  'Improved', 'Increased', 'Launched', 'Led', 'Managed', 'Optimized', 'Organized',
  'Produced', 'Reduced', 'Streamlined', 'Transformed',
];

export function BulletEditor({ bullets, onChange }: BulletEditorProps) {
  const addBullet = () => {
    onChange([...bullets, '']);
  };

  const updateBullet = (index: number, value: string) => {
    const newBullets = [...bullets];
    newBullets[index] = value;
    onChange(newBullets);
  };

  const removeBullet = (index: number) => {
    if (bullets.length > 1) {
      onChange(bullets.filter((_, i) => i !== index));
    }
  };

  const moveBullet = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === bullets.length - 1)
    ) {
      return;
    }

    const newBullets = [...bullets];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap using temporary variable (type-safe)
    const temp = newBullets[index];
    if (temp !== undefined && newBullets[targetIndex] !== undefined) {
      newBullets[index] = newBullets[targetIndex]!;
      newBullets[targetIndex] = temp;
      onChange(newBullets);
    }
  };

  const getRandomVerb = () => {
    return actionVerbs[Math.floor(Math.random() * actionVerbs.length)];
  };

  return (
    <div className="space-y-3">
      {bullets.map((bullet, index) => (
        <div key={index} className="flex gap-2">
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => moveBullet(index, 'up')}
              disabled={index === 0}
              className="rounded p-1 hover:bg-gray-100 disabled:opacity-30"
              title="Move up"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => moveBullet(index, 'down')}
              disabled={index === bullets.length - 1}
              className="rounded p-1 hover:bg-gray-100 disabled:opacity-30"
              title="Move down"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div className="flex-1">
            <textarea
              value={bullet}
              onChange={(e) => updateBullet(index, e.target.value)}
              placeholder={`${getRandomVerb()} [action] resulting in [quantifiable result]...`}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>{bullet.length} characters</span>
              {bullet.length > 0 && !actionVerbs.some((verb) => bullet.startsWith(verb)) && (
                <span className="text-yellow-600">💡 Tip: Start with an action verb</span>
              )}
              {bullet.length > 0 && !/\d/.test(bullet) && (
                <span className="text-yellow-600">💡 Tip: Include quantifiable results</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => removeBullet(index)}
            disabled={bullets.length === 1}
            className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:opacity-30"
            title="Remove bullet"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addBullet}
        className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Bullet Point
      </button>

      {bullets.length < 3 && (
        <p className="text-xs text-yellow-600">
          ⚠️ Recommended: Add at least 3-4 bullet points for better ATS compatibility
        </p>
      )}
    </div>
  );
}

