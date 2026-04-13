import { Rabbit, Leaf, Truck } from "lucide-react";

export function BenefitsSection({ settings }: { settings: Record<string, any> }) {
  const iconMap: Record<string, React.ReactNode> = {
    Rabbit: <Rabbit className="h-6 w-6" />,
    Leaf: <Leaf className="h-6 w-6" />,
    Truck: <Truck className="h-6 w-6" />,
  };

  return (
    <div className="bg-gray-50 py-16 sm:py-24 border-y border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-12">
          {settings.title}
        </h2>
        <div className="grid grid-cols-1 gap-y-12 sm:grid-cols-3 sm:gap-x-8 text-center">
          {settings.benefits.map((benefit: any, idx: number) => (
            <div key={idx} className="flex flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-gray-900 mb-6">
                {iconMap[benefit.icon] || <Leaf className="h-6 w-6" />}
              </div>
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-gray-900">
                {benefit.title}
              </h3>
              <p className="mt-2 text-sm font-medium text-gray-500">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
