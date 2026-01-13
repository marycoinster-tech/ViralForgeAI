interface UserMessageProps {
  niche?: string;
  vibe?: string;
  goal?: string;
  platform?: string;
  customTopic?: string;
}

export function UserMessage({ niche, vibe, goal, platform, customTopic }: UserMessageProps) {
  // Check if it's a simple text message
  const isSimpleMessage = typeof customTopic === 'string' && customTopic.trim() && !niche;
  
  return (
    <div className="mb-6 flex justify-end animate-fade-in">
      <div className="max-w-2xl bg-primary/10 border border-primary/20 rounded-2xl p-4 space-y-2">
        {isSimpleMessage ? (
          <p className="text-sm font-medium whitespace-pre-wrap">{customTopic}</p>
        ) : customTopic ? (
          <p className="text-sm font-medium">{customTopic}</p>
        ) : (
          <>
            <p className="text-sm">
              <span className="text-muted-foreground">Generate:</span>{' '}
              <span className="font-medium">{platform} content</span>
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {niche && (
                <span className="px-2 py-1 rounded-full bg-primary/20 font-medium">
                  {niche}
                </span>
              )}
              {vibe && (
                <span className="px-2 py-1 rounded-full bg-primary/20 font-medium">
                  {vibe}
                </span>
              )}
              {goal && (
                <span className="px-2 py-1 rounded-full bg-primary/20 font-medium">
                  {goal}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
