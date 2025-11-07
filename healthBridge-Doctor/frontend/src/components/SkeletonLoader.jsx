const SkeletonLoader = ({ className = '', variant = 'default' }) => {
  const variants = {
    default: 'h-4 bg-gray-200 rounded',
    card: 'h-32 bg-gray-200 rounded-lg',
    circle: 'w-12 h-12 bg-gray-200 rounded-full',
    text: 'h-3 bg-gray-200 rounded',
    title: 'h-6 bg-gray-200 rounded',
    button: 'h-10 bg-gray-200 rounded-lg',
  };

  return (
    <div className={`${variants[variant]} ${className} animate-pulse`} />
  );
};

export const CardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <SkeletonLoader variant="title" className="w-1/3" />
      <SkeletonLoader variant="text" className="w-full" />
      <SkeletonLoader variant="text" className="w-2/3" />
      <div className="flex gap-2 pt-2">
        <SkeletonLoader variant="button" className="w-24" />
        <SkeletonLoader variant="button" className="w-24" />
      </div>
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <SkeletonLoader key={j} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

export const AppointmentCardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          <SkeletonLoader variant="circle" />
          <div className="space-y-2 flex-1">
            <SkeletonLoader variant="title" className="w-1/2" />
            <SkeletonLoader variant="text" className="w-1/3" />
          </div>
        </div>
        <SkeletonLoader className="w-20 h-6 rounded-full" />
      </div>
      <div className="flex gap-4 pt-2">
        <SkeletonLoader variant="text" className="w-24" />
        <SkeletonLoader variant="text" className="w-32" />
      </div>
    </div>
  );
};

export default SkeletonLoader;

