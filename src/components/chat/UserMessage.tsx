import { Link2, ExternalLink } from 'lucide-react';

interface UserMessageProps {
  niche?: string;
  vibe?: string;
  goal?: string;
  platform?: string;
  customTopic?: string;
}

// Detect URL and extract domain info
const detectUrlInfo = (text: string): { url: string; domain: string; favicon: string } | null => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  if (!match) return null;
  
  const url = match[0];
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    return { url, domain, favicon };
  } catch {
    return null;
  }
};

export function UserMessage({ niche, vibe, goal, platform, customTopic }: UserMessageProps) {
  // Check if it's a simple text message
  const isSimpleMessage = typeof customTopic === 'string' && customTopic.trim() && !niche;
  const urlInfo = customTopic ? detectUrlInfo(customTopic) : null;
  
  return (
    <div className="mb-6 flex justify-end animate-fade-in">
      <div className="max-w-2xl bg-primary/10 border border-primary/20 rounded-2xl p-4 space-y-3">
        {isSimpleMessage ? (
          <>
            <p className="text-sm font-medium whitespace-pre-wrap">{customTopic}</p>
            {urlInfo && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border/40">
                <img 
                  src={urlInfo.favicon} 
                  alt={urlInfo.domain}
                  className="w-4 h-4"
                  onError={(e) => {
                    // Fallback to link icon if favicon fails
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <Link2 className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium truncate flex-1">
                  {urlInfo.domain}
                </span>
                <a 
                  href={urlInfo.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </>
        ) : customTopic ? (
          <>
            <p className="text-sm font-medium">{customTopic}</p>
            {urlInfo && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border/40">
                <img 
                  src={urlInfo.favicon} 
                  alt={urlInfo.domain}
                  className="w-4 h-4"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <Link2 className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium truncate flex-1">
                  {urlInfo.domain}
                </span>
                <a 
                  href={urlInfo.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </>
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
