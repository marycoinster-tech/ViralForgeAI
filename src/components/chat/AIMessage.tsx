import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Copy, Check, Flame, FileText, Hash, Eye,
  Lightbulb, Sparkles, RotateCw, Share2,
  Twitter, Instagram,
} from 'lucide-react';
import { ContentReviewPanel } from '@/components/features/ContentReviewPanel';

interface AIMessageProps {
  content: any;
  onRemix?: (iteration: number) => void;
  remixIteration?: number;
}

export function AIMessage({ content, onRemix, remixIteration = 0 }: AIMessageProps) {
  const { toast } = useToast();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const isStructuredContent =
    typeof content === 'object' && content !== null && 'hook' in content && 'script' in content;

  const copyToClipboard = async (text: string, section: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast({ title: 'Copied!', description: `${section} copied to clipboard` });
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const copyAll = async () => {
    let allText = '';
    if (isStructuredContent) {
      allText = `HOOK:\n${content.hook}\n\nSCRIPT:\n${content.script}\n\nCAPTION:\n${content.caption}\n\nHASHTAGS:\n${
        content.hashtags?.map((tag: string) => `#${tag}`).join(' ') || ''
      }\n\nVISUAL IDEA:\n${content.visualIdea}\n\nPOSTING TIP:\n${content.postingTip}`.trim();
    } else {
      allText = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    }
    await navigator.clipboard.writeText(allText);
    toast({ title: 'Copied!', description: 'Content copied to clipboard' });
  };

  // Build share text
  const buildShareText = () => {
    if (!isStructuredContent) return typeof content === 'string' ? content : '';
    const hashtags = content.hashtags?.map((t: string) => `#${t}`).join(' ') || '';
    return `${content.hook}\n\n${content.caption}\n\n${hashtags}`;
  };

  const handleShareTikTok = async () => {
    const text = buildShareText();
    await navigator.clipboard.writeText(text);
    toast({ title: '📋 TikTok caption copied!', description: 'Paste it into TikTok when you upload.' });
    window.open('https://www.tiktok.com/upload', '_blank');
    setShareOpen(false);
  };

  const handleShareInstagram = async () => {
    const text = buildShareText();
    await navigator.clipboard.writeText(text);
    toast({ title: '📋 Instagram caption copied!', description: 'Paste it when you post on Instagram.' });
    window.open('https://www.instagram.com', '_blank');
    setShareOpen(false);
  };

  const handleShareTwitter = () => {
    if (!isStructuredContent) return;
    const tweetText = encodeURIComponent(
      `${content.hook}\n\n${content.hashtags?.slice(0, 3).map((t: string) => `#${t}`).join(' ') || ''}`
    );
    window.open(`https://x.com/intent/tweet?text=${tweetText}`, '_blank');
    setShareOpen(false);
  };

  const Section = ({
    icon: Icon,
    title,
    content: text,
    sectionKey,
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
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
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

  // ── Structured viral content card ──
  if (isStructuredContent) {
    return (
      <div className="mb-6 animate-fade-in">
        <div className="max-w-3xl glass-card p-5 sm:p-6 space-y-5">
          <Section icon={Flame} title="HOOK" content={content.hook} sectionKey="hook" />
          <div className="border-t border-border/40" />
          <Section icon={FileText} title="SCRIPT" content={content.script} sectionKey="script" />
          <div className="border-t border-border/40" />
          <Section icon={FileText} title="CAPTION" content={content.caption} sectionKey="caption" />
          <div className="border-t border-border/40" />

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
                    onClick={() =>
                      copyToClipboard(
                        content.hashtags.map((tag: string) => `#${tag}`).join(' '),
                        'HASHTAGS',
                      )
                    }
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

          {/* ── Action row ── */}
          <div className="border-t border-border/40 pt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={copyAll}
                variant="outline"
                className="flex-1 min-w-[120px] h-10 font-semibold border-primary/20 hover:bg-primary/10"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy All
              </Button>
              {onRemix && (
                <Button
                  onClick={() => onRemix(remixIteration + 1)}
                  variant="outline"
                  className="h-10 px-4 font-semibold border-accent/40 hover:bg-accent/10"
                  title="Remix this content"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              )}
              {/* Share toggle */}
              <Button
                onClick={() => setShareOpen((v) => !v)}
                variant={shareOpen ? 'default' : 'outline'}
                className={`h-10 px-4 font-semibold ${
                  shareOpen
                    ? 'bg-primary text-primary-foreground'
                    : 'border-primary/20 hover:bg-primary/10'
                }`}
              >
                <Share2 className="mr-1.5 h-4 w-4" />
                Share
              </Button>
            </div>

            {/* Share buttons — slide open */}
            {shareOpen && (
              <div className="animate-fade-in flex flex-wrap gap-2 p-3 rounded-xl bg-muted/40 border border-border/40">
                {/* TikTok */}
                <button
                  onClick={handleShareTikTok}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white text-xs font-bold hover:bg-black/80 transition-colors flex-1 justify-center min-w-[90px]"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.99a8.18 8.18 0 004.79 1.53V7.07a4.85 4.85 0 01-1.02-.38z"/>
                  </svg>
                  TikTok
                </button>

                {/* Instagram */}
                <button
                  onClick={handleShareInstagram}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity flex-1 justify-center min-w-[90px]"
                  style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: '#fff' }}
                >
                  <Instagram className="h-3.5 w-3.5" />
                  Instagram
                </button>

                {/* Twitter/X */}
                <button
                  onClick={handleShareTwitter}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-colors flex-1 justify-center min-w-[90px]"
                >
                  <Twitter className="h-3.5 w-3.5" />
                  X / Twitter
                </button>
              </div>
            )}
          </div>

          <ContentReviewPanel
            hook={content.hook}
            script={content.script}
            caption={content.caption}
            hashtags={content.hashtags || []}
            niche={content.niche || ''}
            vibe={content.vibe || ''}
          />
        </div>
      </div>
    );
  }

  // ── Conversational message ──
  const textContent =
    typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  const formatText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('### '))
        return (
          <h3 key={i} className="text-sm font-bold mb-2 mt-3">
            {line.slice(4)}
          </h3>
        );
      if (line.startsWith('## '))
        return (
          <h2 key={i} className="text-base font-bold mb-2 mt-3">
            {line.slice(3)}
          </h2>
        );
      if (line.startsWith('# '))
        return (
          <h1 key={i} className="text-lg font-bold mb-2 mt-3">
            {line.slice(2)}
          </h1>
        );
      if (line.match(/^[-*]\s/))
        return (
          <li key={i} className="text-sm ml-4 mb-1">
            {line.slice(2)}
          </li>
        );
      if (line.match(/^\d+\.\s/))
        return (
          <li key={i} className="text-sm ml-4 mb-1">
            {line.replace(/^\d+\.\s/, '')}
          </li>
        );
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const formatted = parts.map((part, j) =>
        j % 2 === 1 ? (
          <strong key={j} className="font-semibold">
            {part}
          </strong>
        ) : (
          part
        ),
      );
      if (!line.trim()) return <br key={i} />;
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
          <div className="mt-1 p-2 rounded-lg bg-primary/10 flex-shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div className="space-y-1">{formatText(textContent)}</div>
            <div className="flex gap-2">
              <Button onClick={copyAll} variant="ghost" size="sm" className="h-8">
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copy
              </Button>
              {onRemix && (
                <Button
                  onClick={() => onRemix(remixIteration + 1)}
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  title="Remix"
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
