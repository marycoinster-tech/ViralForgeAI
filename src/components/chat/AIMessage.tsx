import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Flame, FileText, Hash, Eye, Lightbulb, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIMessageProps {
  content: any; // Can be structured viral content or plain text
}

export function AIMessage({ content }: AIMessageProps) {
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

          {/* Copy All Button */}
          <Button
            onClick={copyAll}
            variant="outline"
            className="w-full h-10 font-semibold border-primary/20 hover:bg-primary/10"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Everything
          </Button>
        </div>
      </div>
    );
  }

  // Render conversational message
  const textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  return (
    <div className="mb-6 animate-fade-in">
      <div className="max-w-3xl">
        <div className="flex items-start gap-3">
          <div className="mt-1 p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="text-sm leading-relaxed mb-3 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3">{children}</ol>,
                  li: ({ children }) => <li className="text-sm">{children}</li>,
                  code: ({ children }) => <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">{children}</code>,
                  pre: ({ children }) => <pre className="p-3 rounded-lg bg-muted overflow-x-auto mb-3">{children}</pre>,
                  h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-bold mb-2">{children}</h3>,
                }}
              >
                {textContent}
              </ReactMarkdown>
            </div>
            <Button
              onClick={copyAll}
              variant="ghost"
              size="sm"
              className="h-8"
            >
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copy
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
