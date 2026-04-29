interface ScoreBreakdownItem {
  label: string;
  score: number | null;
}

interface ScoreBreakdownProps {
  items: ScoreBreakdownItem[];
}

const getBarColorClass = (score: number) => {
  if (score >= 70) return 'from-emerald-400 to-emerald-500';
  if (score >= 40) return 'from-amber-400 to-amber-500';
  return 'from-rose-400 to-rose-500';
};

const ScoreBreakdown = ({ items }: ScoreBreakdownProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Score Breakdown</h3>
      <div className="space-y-4">
        {items.map((item) => {
          const hasScore = typeof item.score === 'number' && !Number.isNaN(item.score);
          const scoreValue = hasScore ? Math.max(0, Math.min(100, item.score)) : null;

          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                <span className="text-sm font-semibold text-gray-800">
                  {scoreValue === null ? 'N/A' : `${scoreValue}/100`}
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                {scoreValue === null ? (
                  <div className="h-full w-full bg-gray-200/80" />
                ) : (
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${getBarColorClass(scoreValue)} transition-all duration-700`}
                    style={{ width: `${scoreValue}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScoreBreakdown;
