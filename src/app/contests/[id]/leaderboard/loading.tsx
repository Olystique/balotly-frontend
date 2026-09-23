import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-voter flex-1 flex-col gap-5 px-4 pb-10 pt-5 sm:max-w-xl" aria-busy="true">
      <SkeletonText className="w-16" />
      <SkeletonText className="h-8 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-tap w-32 rounded-full" />
        <Skeleton className="h-tap w-28 rounded-full" />
        <Skeleton className="h-tap w-24 rounded-full" />
      </div>
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-16 rounded-lg" />
      ))}
    </main>
  );
}
