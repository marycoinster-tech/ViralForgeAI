import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Flame, FileText, Hash, Eye, Lightbulb, Sparkles, RotateCw } from 'lucide-react';

interface AIMessageProps {
  content: any; // Can be structured viral content or plain text
  onRemix?: (iteration: number) => void;
  remixIteration?: number;
}

export function AIMessage({ content, onRemix, remixIteration = 0 }: AIMessageProps) {
  const { toast } = useToast();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Check if content is structured viral content
  const isStructuredContent = typeof content === 'object' && content.hook && content.script;

  const copyToClipboard = async (text: string, section: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast({
      title: 'Copied!',
      description: `${section} copied to clipboard`,
    });
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const copyAll = async () => {
    let allText = '';
    if (isStructuredContent) {
      allText = `
HOOK:
${content.hook}

SCRIPT:
${content.script}

CAPTION:
${content.caption}

HASHTAGS:
${content.hashtags?.map((tag: string) => `#${tag}`).join(' ') || ''}

VISUAL IDEA:
${content.visualIdea}

POSTING TIP:
${content.postingTip}
      `.trim();
    } else {
      allText = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    }

    await navigator.clipboard.writeText(allText);
    toast({
      title: 'Copied!',
      description: 'Content copied to clipboard',
    });
  };

  const Section = ({ 
    icon: Icon, 
    title, 
    content: text, 
    sectionKey 
  }: { 
    icon: any; 
    title: string; 
    content: string; 
    sectionKey: string;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {title}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(text, title)}
          className="h-7 px-2"
        >
          {copiedSection === title ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );

  // Render structured viral content
  if (isStructuredContent) {
    return (
      <div className="mb-6 animate-fade-in">
        <div className="max-w-3xl glass-card p-6 space-y-6">
          {/* Hook */}
          <Section
            icon={Flame}
            title="HOOK"
            content={content.hook}
            sectionKey="hook"
          />

          <div className="border-t border-border/40" />

          {/* Script */}
          <Section
            icon={FileText}
            title="SCRIPT"
            content={content.script}
            sectionKey="script"
          />

          <div className="border-t border-border/40" />

          {/* Caption */}
          <Section
            icon={FileText}
            title="CAPTION"
            content={content.caption}
            sectionKey="caption"
          />

          <div className="border-t border-border/40" />

          {/* Hashtags */}
          {content.hashtags && content.hashtags.length > 0 && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                      HASHTAGS
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(content.hashtags.map((tag: string) => `#${tag}`).join(' '), 'HASHTAGS')}
                    className="h-7 px-2"
                  >
                    {copiedSection === 'HASHTAGS' ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {content.hashtags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-border/40" />
            </>
          )}

          {/* Visual Idea */}
          {content.visualIdea && (
            <>
              <Section
                icon={Eye}
                title="VISUAL IDEA"
                content={content.visualIdea}
                sectionKey="visual"
              />

              <div className="border-t border-border/40" />
            </>
          )}

          {/* Posting Tip */}
          {content.postingTip && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  POSTING TIP
                </h3>
              </div>
              <p className="text-sm bg-primary/5 border border-primary/10 rounded-lg p-3">
                💡 {content.postingTip}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={copyAll}
              variant="outline"
              className="flex-1 h-10 font-semibold border-primary/20 hover:bg-primary/10"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Everything
            </Button>
            {onRemix && (
              <Button
                onClick={() => onRemix(remixIteration + 1)}
                variant="outline"
                className="h-10 px-4 font-semibold border-accent/40 hover:bg-accent/10"
                title="Remix this content to make it 30% better"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render conversational message
  const textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  // Simple markdown-like formatting
  const formatText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-sm font-bold mb-2 mt-3">{line.slice(4)}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-base font-bold mb-2 mt-3">{line.slice(3)}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-lg font-bold mb-2 mt-3">{line.slice(2)}</h1>;
      }
      
      // Lists
      if (line.match(/^[-*]\s/)) {
        return (
          <li key={i} className="text-sm ml-4 mb-1">
            {line.slice(2)}
          </li>
        );
      }
      if (line.match(/^\d+\.\s/)) {
        return (
          <li key={i} className="text-sm ml-4 mb-1">
            {line.replace(/^\d+\.\s/, '')}
          </li>
        );
      }
      
      // Bold text **text**
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const formatted = parts.map((part, j) => 
        j % 2 === 1 ? <strong key={j} className="font-semibold">{part}</strong> : part
      );
      
      // Empty line
      if (!line.trim()) {
        return <br key={i} />;
      }
      
      // Regular paragraph
      return (
        <p key={i} className="text-sm leading-relaxed mb-3">
          {formatted}
        </p>
      );
    });
  };

  return (
    <div className="mb-6 animate-fade-in">
      <div className="max-w-3xl">
        <div className="flex items-start gap-3">
          <div className="mt-1 p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              {formatText(textContent)}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={copyAll}
                variant="ghost"
                size="sm"
                className="h-8"
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copy
              </Button>
              {onRemix && (
                <Button
                  onClick={() => onRemix(remixIteration + 1)}
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  title="Remix this content to make it 30% better"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
