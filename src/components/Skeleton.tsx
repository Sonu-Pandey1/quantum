

interface SkeletonProps {
  className?: string;
  variant?: 'rectangle' | 'circle' | 'text';
}

export function Skeleton({ className = '', variant = 'rectangle' }: SkeletonProps) {
  const baseClasses = "animate-pulse bg-white/5 border border-white/5";
  const variantClasses = {
    rectangle: "rounded-xl",
    circle: "rounded-full",
    text: "rounded-md h-4 w-full"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-panel p-4 space-y-4 rounded-xl border border-white/5 animate-pulse h-full">
      <div className="flex items-center space-x-3">
        <Skeleton variant="rectangle" className="w-10 h-10" />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" className="w-1/2 h-3" />
          <Skeleton variant="text" className="w-1/4 h-2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" className="w-full h-2" />
        <Skeleton variant="text" className="w-5/6 h-2" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center p-4 space-x-4 glass-panel rounded-xl border border-white/5 animate-pulse">
          <Skeleton variant="rectangle" className="w-12 h-12" />
          <div className="flex-1 space-y-3">
            <Skeleton variant="text" className="w-1/3 h-3" />
            <Skeleton variant="text" className="w-1/4 h-2" />
          </div>
          <Skeleton variant="rectangle" className="w-16 h-8" />
        </div>
      ))}
    </div>
  );
}

export function GraphSkeleton() {
  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/5 animate-pulse w-full h-48 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton variant="text" className="w-32 h-4" />
        <Skeleton variant="text" className="w-20 h-3" />
      </div>
      <div className="grid grid-cols-12 gap-2 h-24">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-full" />
        ))}
      </div>
    </div>
  );
}
