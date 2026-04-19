export function TableSkeleton() {
  return (
    <div className="w-full animate-pulse">
      {/* Table Header Skeleton */}
      <div className="flex border-b border-[color:var(--hairline)] bg-[var(--surface-0)] px-6 py-4">
        <div className="h-4 w-4 rounded-[var(--r-xs)] bg-[var(--surface-3)] mr-6"></div>
        <div className="grid grid-cols-7 w-full gap-4">
           {[...Array(7)].map((_, i) => (
             <div key={i} className="h-3 bg-[var(--surface-2)] rounded-[var(--r-xs)] w-full"></div>
           ))}
        </div>
      </div>

      {/* Table Rows Skeleton */}
      <div className="divide-y divide-[color:var(--hairline)]">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex px-6 py-5">
            <div className="h-4 w-4 rounded-[var(--r-xs)] bg-[var(--surface-2)] mr-6"></div>
            <div className="grid grid-cols-7 w-full gap-4 items-center">
              <div className="h-4 bg-[var(--surface-3)] rounded-[var(--r-xs)] w-3/4"></div>
              <div className="h-4 bg-[var(--surface-2)] rounded-[var(--r-xs)] w-1/2"></div>
              <div className="space-y-2">
                <div className="h-4 bg-[var(--surface-3)] rounded-[var(--r-xs)] w-full"></div>
                <div className="h-3 bg-[var(--surface-2)] rounded-[var(--r-xs)] w-2/3"></div>
              </div>
              <div className="h-4 bg-[var(--surface-2)] rounded-[var(--r-xs)] w-1/2"></div>
              <div className="h-6 bg-[var(--surface-3)] rounded-[var(--r-xs)] w-20"></div>
              <div className="h-4 bg-[var(--surface-2)] rounded-[var(--r-xs)] w-1/3"></div>
              <div className="h-4 bg-[var(--surface-3)] rounded-[var(--r-xs)] w-1/2 ml-auto"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
