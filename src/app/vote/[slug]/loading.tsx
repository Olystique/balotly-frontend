import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** The vote page's shape, so a slow connection shows structure straight away. */
export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-voter flex-1 flex-col gap-6 px-4 pb-10 pt-5" aria-busy="true">
      <SkeletonText className="w-40" />
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-28 rounded-full" />
        <SkeletonText className="h-7 w-48" />
        <SkeletonText className="w-40" />
      </div>
      <div className="flex flex-col gap-2.5">
        <SkeletonText className="mb-1 h-6 w-36" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      <Skeleton className="h-tap rounded-lg" />
    </main>
  );
}
