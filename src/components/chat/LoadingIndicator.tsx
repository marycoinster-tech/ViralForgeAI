export function LoadingIndicator() {
  return (
    <div className="mb-6 animate-fade-in">
      <div className="max-w-3xl glass-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Cooking up viral content...
          </p>
        </div>

        {/* Skeleton */}
        <div className="space-y-3">
          <div className="h-4 bg-muted/30 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-muted/30 rounded animate-pulse w-full" />
          <div className="h-4 bg-muted/30 rounded animate-pulse w-2/3" />
        </div>
      </div>
    </div>
  );
}
