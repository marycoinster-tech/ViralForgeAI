import { useState } from 'react';
import { GeneratedContent } from '@/types/content';
import { Button } from '@/components/ui/button';
import { Copy, Check, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OutputDisplayProps {
  content: GeneratedContent;
}

export function OutputDisplay({ content }: OutputDisplayProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast({
      title: "Copied! 🔥",
      description: `${section} copied to clipboard`,
    });
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const sections = [
    {
      id: 'hook',
      title: 'HOOK',
      content: content.hook,
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      id: 'script',
      title: 'SCRIPT',
      content: content.script,
      gradient: 'from-pink-500 to-orange-500',
    },
    {
      id: 'caption',
      title: 'CAPTION',
      content: content.caption,
      gradient: 'from-orange-500 to-yellow-500',
    },
    {
      id: 'hashtags',
      title: 'HASHTAGS',
      content: content.hashtags.map(tag => `#${tag}`).join(' '),
      gradient: 'from-yellow-500 to-green-500',
    },
    {
      id: 'visual',
      title: 'VISUAL IDEA',
      content: content.visualIdea,
      gradient: 'from-green-500 to-cyan-500',
    },
    {
      id: 'tip',
      title: 'POSTING TIP',
      content: content.postingTip,
      gradient: 'from-cyan-500 to-blue-500',
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" fill="currentColor" />
          Your Viral Content
        </h3>
      </div>

      {sections.map((section, index) => (
        <div
          key={section.id}
          className="glass-card p-5 sm:p-6 space-y-3 animate-fade-in hover:scale-[1.01] transition-transform"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-1 w-12 rounded-full bg-gradient-to-r ${section.gradient}`} />
              <h4 className="text-sm font-bold text-muted-foreground tracking-wider">
                {section.title}
              </h4>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(section.content, section.title)}
              className="hover:bg-primary/10"
            >
              {copiedSection === section.title ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <div className="text-foreground font-medium whitespace-pre-wrap leading-relaxed">
            {section.content}
          </div>
        </div>
      ))}

      <div className="glass-card p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <p className="text-sm text-center font-semibold">
          💡 Pro tip: Test different vibes and niches to find what works best for your audience
        </p>
      </div>
    </div>
  );
}
