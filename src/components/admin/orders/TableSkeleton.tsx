export function TableSkeleton() {
  return (
    <div className="w-full animate-pulse">
      {/* Table Header Skeleton */}
      <div className="flex border-b border-[#EAEAEA] bg-white px-6 py-4">
        <div className="h-4 w-4 rounded bg-gray-200 mr-6"></div>
        <div className="grid grid-cols-7 w-full gap-4">
           {[...Array(7)].map((_, i) => (
             <div key={i} className="h-3 bg-gray-100 rounded w-full"></div>
           ))}
        </div>
      </div>

      {/* Table Rows Skeleton */}
      <div className="divide-y divide-[#EAEAEA]/80">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex px-6 py-5">
            <div className="h-4 w-4 rounded bg-gray-100 mr-6"></div>
            <div className="grid grid-cols-7 w-full gap-4 items-center">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-100 rounded w-2/3"></div>
              </div>
              <div className="h-4 bg-gray-100 rounded w-1/2"></div>
              <div className="h-6 bg-gray-200 rounded-full w-20"></div>
              <div className="h-4 bg-gray-100 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 ml-auto"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
