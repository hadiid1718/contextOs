const StepProgress = ({ currentStep, totalSteps }) => {
  const progress = Math.min(100, Math.max(0, (currentStep / totalSteps) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium text-text3">
        <span>Step {currentStep}</span>
        <span>{totalSteps}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface">
        <div className="h-full bg-brand transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

export default StepProgress;

