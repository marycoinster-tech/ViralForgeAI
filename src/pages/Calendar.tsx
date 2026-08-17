import { useState, useEffect, useRef, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight, Clock,
  Trash2, Edit2, CheckCircle2, Loader2, Zap, X, LayoutGrid, List,
} from 'lucide-react';

// ── Date helpers ─────────────────────────────────────────────────────────────

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const result = new Date(d);
  result.setDate(d.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(d.getDate() + n); return r;
}
function addWeeks(d: Date, n: number): Date { return addDays(d, n * 7); }

const SHORT_DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SHORT_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtShort = (d: Date) => `${SHORT_MON[d.getMonth()]} ${d.getDate()}`;
const fmtYear = (d: Date) => String(d.getFullYear());
const fmtDay = (d: Date) => d.getDate();
const fmtDow = (d: Date) => SHORT_DAY[(d.getDay() + 6) % 7];
const fmtDowFull = (d: Date) => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()];

// ── Constants ────────────────────────────────────────────────────────────────

const NICHES = ['anime','motivation','money','dating','gym','ai & tech','storytime','fashion','gaming','beauty','food','travel','general'];
const PLATFORMS = ['TikTok', 'Instagram Reels', 'YouTube Shorts'];
const STATUSES = ['scheduled', 'posted', 'draft'] as const;
type Status = typeof STATUSES[number];

const OPTIMAL_TIMES: Record<string, { label: string; times: string[] }[]> = {
  TikTok: [
    { label: 'Morning peak', times: ['07:00', '08:00', '09:00'] },
    { label: 'Lunch spike', times: ['12:00', '13:00'] },
    { label: 'Evening prime', times: ['19:00', '20:00', '21:00'] },
  ],
  'Instagram Reels': [
    { label: 'Morning', times: ['09:00', '10:00', '11:00'] },
    { label: 'Afternoon', times: ['14:00', '15:00'] },
    { label: 'Evening', times: ['17:00', '18:00', '19:00'] },
  ],
  'YouTube Shorts': [
    { label: 'Midday', times: ['12:00', '13:00', '14:00'] },
    { label: 'Evening', times: ['19:00', '20:00', '21:00'] },
  ],
};

const NICHE_COLORS: Record<string, string> = {
  anime: 'bg-violet-500/20 border-violet-500/40 text-violet-300',
  motivation: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
  money: 'bg-green-500/20 border-green-500/40 text-green-300',
  dating: 'bg-pink-500/20 border-pink-500/40 text-pink-300',
  gym: 'bg-red-500/20 border-red-500/40 text-red-300',
  'ai & tech': 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',
  storytime: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  fashion: 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300',
  gaming: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  beauty: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
  food: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
  travel: 'bg-teal-500/20 border-teal-500/40 text-teal-300',
  general: 'bg-muted/50 border-border text-muted-foreground',
};

const STATUS_STYLES: Record<Status, string> = {
  scheduled: 'text-primary',
  posted: 'text-green-400',
  draft: 'text-muted-foreground',
};
const STATUS_ICONS: Record<Status, string> = { scheduled: '📅', posted: '✅', draft: '📝' };

// ── Types ────────────────────────────────────────────────────────────────────

interface ScheduledPost {
  id: string;
  title: string;
  hook: string;
  script?: string;
  caption?: string;
  hashtags: string[];
  niche: string;
  platform: string;
  scheduled_date: string;
  scheduled_time: string;
  status: Status;
  notes?: string;
}

interface PostFormData {
  title: string; hook: string; script: string; caption: string;
  hashtags: string; niche: string; platform: string;
  scheduled_date: string; scheduled_time: string; status: Status; notes: string;
}

const DEFAULT_FORM: PostFormData = {
  title: '', hook: '', script: '', caption: '', hashtags: '',
  niche: 'general', platform: 'TikTok',
  scheduled_date: toYMD(new Date()), scheduled_time: '18:00',
  status: 'scheduled', notes: '',
};

// ── SwipeToDelete wrapper ─────────────────────────────────────────────────────

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: React.ReactNode;
}

function SwipeToDelete({ onDelete, children }: SwipeToDeleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const THRESHOLD = 72;

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setRevealed(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null) return;
    const dx = startXRef.current - e.touches[0].clientX;
    if (dx > 0) setOffset(Math.min(dx, THRESHOLD + 16));
  };

  const handleTouchEnd = () => {
    if (offset >= THRESHOLD) {
      setRevealed(true);
      setOffset(THRESHOLD);
    } else {
      setOffset(0);
      setRevealed(false);
    }
    startXRef.current = null;
  };

  const reset = () => { setOffset(0); setRevealed(false); };

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-xl">
      {/* Delete action revealed behind */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-destructive"
        style={{ width: THRESHOLD, borderRadius: '0 12px 12px 0' }}
      >
        <button
          onPointerDown={(e) => { e.stopPropagation(); reset(); onDelete(); }}
          className="flex flex-col items-center gap-1 px-4 py-2 min-h-[44px]"
        >
          <Trash2 className="h-5 w-5 text-white" />
          <span className="text-white text-[10px] font-bold">Delete</span>
        </button>
      </div>

      {/* Sliding content */}
      <div
        className="relative transition-transform duration-150 ease-out will-change-transform"
        style={{ transform: `translateX(-${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => revealed && reset()}
      >
        {children}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function Calendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPost, setEditPost] = useState<ScheduledPost | null>(null);
  const [form, setForm] = useState<PostFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [userTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${fmtShort(weekDays[0])} – ${fmtShort(weekDays[6])}, ${fmtYear(weekDays[6])}`;

  useEffect(() => { if (user) loadPosts(); }, [user, weekStart]);

  const loadPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('scheduled_posts').select('*')
      .gte('scheduled_date', toYMD(weekDays[0]))
      .lte('scheduled_date', toYMD(weekDays[6]))
      .order('scheduled_time');
    if (!error) setPosts((data || []).map(p => ({ ...p, hashtags: p.hashtags || [] })));
    setLoading(false);
  };

  const openNew = (day?: Date) => {
    setEditPost(null);
    setForm({ ...DEFAULT_FORM, scheduled_date: day ? toYMD(day) : toYMD(new Date()) });
    setShowModal(true);
  };

  const openEdit = (post: ScheduledPost) => {
    setEditPost(post);
    setForm({
      title: post.title, hook: post.hook, script: post.script || '',
      caption: post.caption || '', hashtags: post.hashtags.join(' '),
      niche: post.niche, platform: post.platform,
      scheduled_date: post.scheduled_date,
      scheduled_time: post.scheduled_time.substring(0, 5),
      status: post.status, notes: post.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.hook.trim()) {
      toast({ title: 'Title and hook are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user!.id,
      title: form.title.trim(), hook: form.hook.trim(),
      script: form.script.trim() || null, caption: form.caption.trim() || null,
      hashtags: form.hashtags.split(/\s+/).filter(Boolean),
      niche: form.niche, platform: form.platform,
      scheduled_date: form.scheduled_date,
      scheduled_time: form.scheduled_time + ':00',
      status: form.status, notes: form.notes.trim() || null,
    };
    if (editPost) {
      const { error } = await supabase.from('scheduled_posts').update(payload).eq('id', editPost.id);
      if (error) toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Post updated!' }); setShowModal(false); loadPosts(); }
    } else {
      const { error } = await supabase.from('scheduled_posts').insert(payload);
      if (error) toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Post scheduled! 🗓️' }); setShowModal(false); loadPosts(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this scheduled post?')) return;
    setDeletingId(id);
    const { error } = await supabase.from('scheduled_posts').delete().eq('id', id);
    if (error) toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
    else { setPosts(prev => prev.filter(p => p.id !== id)); toast({ title: 'Post deleted' }); }
    setDeletingId(null);
  };

  const handleMarkPosted = async (post: ScheduledPost) => {
    const newStatus: Status = post.status === 'posted' ? 'scheduled' : 'posted';
    const { error } = await supabase.from('scheduled_posts').update({ status: newStatus }).eq('id', post.id);
    if (!error) setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: newStatus } : p));
  };

  const getPostsForDay = (day: Date) => posts.filter(p => isSameDay(parseYMD(p.scheduled_date), day));
  const totalThisWeek = posts.length;
  const postedThisWeek = posts.filter(p => p.status === 'posted').length;

  const sortedPosts = [...posts].sort((a, b) =>
    `${a.scheduled_date}T${a.scheduled_time}`.localeCompare(`${b.scheduled_date}T${b.scheduled_time}`)
  );

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-5">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
                <CalendarDays className="h-3.5 w-3.5" />
                Content Calendar
              </div>
              <h1 className="text-2xl font-black">
                Your <span className="text-gradient">Posting Schedule</span>
              </h1>
              <p className="text-muted-foreground text-xs mt-0.5">
                {userTimezone} · {totalThisWeek} posts · {postedThisWeek} posted
              </p>
            </div>
            <div className="flex gap-2 items-center">
              {/* View mode toggle — desktop only */}
              <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg bg-muted/40 border border-border/40">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
              <Button
                onClick={() => openNew()}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4"
              >
                <Plus className="h-4 w-4" />
                <span className="font-bold">Schedule Post</span>
              </Button>
            </div>
          </div>

          {/* Week navigator */}
          <div className="glass-card p-3 sm:p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => setWeekStart(w => addWeeks(w, -1))} className="h-9 w-9 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={() => setWeekStart(getWeekStart(new Date()))}
                className="text-sm font-bold hover:text-primary transition-colors px-2"
              >
                {weekLabel}
              </button>
              <Button variant="ghost" size="sm" onClick={() => setWeekStart(w => addWeeks(w, 1))} className="h-9 w-9 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* ── DESKTOP grid (≥sm) ── */}
                <div className="hidden sm:grid grid-cols-7 gap-1.5">
                  {weekDays.map((day, i) => {
                    const dayPosts = getPostsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div key={i} className="flex flex-col min-h-[120px]">
                        <button
                          onClick={() => openNew(day)}
                          className={`text-center py-2 px-1 rounded-lg mb-1.5 transition-all hover:bg-primary/10 min-h-[44px] ${isToday ? 'bg-primary/10 border border-primary/30' : ''}`}
                        >
                          <p className="text-[10px] text-muted-foreground font-medium uppercase">{fmtDow(day)}</p>
                          <p className={`text-lg font-black leading-none mt-0.5 ${isToday ? 'text-primary' : ''}`}>{fmtDay(day)}</p>
                        </button>
                        <div className="flex-1 space-y-1.5">
                          {dayPosts.map(post => (
                            <button
                              key={post.id}
                              onClick={() => openEdit(post)}
                              className={`w-full text-left p-1.5 rounded-md border text-[10px] leading-tight transition-all hover:scale-[1.02] min-h-[44px] ${NICHE_COLORS[post.niche] || NICHE_COLORS.general} ${post.status === 'posted' ? 'opacity-60' : ''}`}
                            >
                              <div className="flex items-center gap-0.5 mb-0.5">
                                <span>{STATUS_ICONS[post.status]}</span>
                                <span className="font-bold">{post.scheduled_time.substring(0, 5)}</span>
                              </div>
                              <p className="font-semibold truncate">{post.title || post.hook.substring(0, 20)}</p>
                              <p className="opacity-70 truncate">{post.platform}</p>
                            </button>
                          ))}
                          {dayPosts.length === 0 && (
                            <button
                              onClick={() => openNew(day)}
                              className="w-full h-10 rounded-md border border-dashed border-border/30 text-[10px] text-muted-foreground/50 hover:border-primary/30 hover:text-primary/50 transition-all flex items-center justify-center"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── MOBILE vertical stack (<sm) ── */}
                <div className="sm:hidden space-y-2">
                  {weekDays.map((day, i) => {
                    const dayPosts = getPostsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div
                        key={i}
                        className={`rounded-xl border transition-all ${isToday ? 'border-primary/40 bg-primary/5' : 'border-border/30 bg-card/40'}`}
                      >
                        {/* Day header row */}
                        <button
                          onClick={() => openNew(day)}
                          className="w-full flex items-center justify-between px-3 py-3 min-h-[52px] group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl flex flex-col items-center justify-center shrink-0 ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-foreground'}`}>
                              <span className="text-[10px] font-bold uppercase">{fmtDow(day)}</span>
                              <span className="text-base font-black leading-none">{fmtDay(day)}</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-left">{fmtDowFull(day)}</p>
                              <p className="text-xs text-muted-foreground text-left">{fmtShort(day)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {dayPosts.length > 0 && (
                              <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {dayPosts.length} post{dayPosts.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <Plus className="h-3.5 w-3.5 text-primary" />
                            </div>
                          </div>
                        </button>

                        {/* Posts for this day */}
                        {dayPosts.length > 0 && (
                          <div className="px-3 pb-3 space-y-2">
                            {dayPosts.map(post => (
                              <button
                                key={post.id}
                                onClick={() => openEdit(post)}
                                className={`w-full text-left p-3 rounded-xl border min-h-[60px] transition-all active:scale-[0.98] ${NICHE_COLORS[post.niche] || NICHE_COLORS.general} ${post.status === 'posted' ? 'opacity-60' : ''}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <span className="text-sm">{STATUS_ICONS[post.status]}</span>
                                      <span className="text-xs font-bold">{post.scheduled_time.substring(0, 5)}</span>
                                      <span className="text-[10px] bg-background/30 px-1.5 py-0.5 rounded-full">{post.platform}</span>
                                    </div>
                                    <p className="text-sm font-bold truncate">{post.title || post.hook.substring(0, 40)}</p>
                                    <p className="text-xs opacity-70 truncate mt-0.5">"{post.hook}"</p>
                                  </div>
                                  <span className={`text-[10px] font-bold shrink-0 capitalize ${STATUS_STYLES[post.status]}`}>{post.status}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Sorted post list — swipe-to-delete on mobile */}
          {sortedPosts.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-xs text-muted-foreground uppercase tracking-widest px-1">
                This Week's Posts
              </h2>
              <div className="space-y-2">
                {sortedPosts.map(post => {
                  const d = parseYMD(post.scheduled_date);
                  const card = (
                    <div
                      className={`glass-card p-3 sm:p-4 flex items-start gap-3 sm:gap-4 border ${NICHE_COLORS[post.niche] || NICHE_COLORS.general} ${post.status === 'posted' ? 'opacity-60' : ''}`}
                    >
                      {/* Date badge */}
                      <div className="shrink-0 text-center w-10 sm:w-12 min-w-0">
                        <p className="text-[10px] text-muted-foreground">{fmtDow(d)}</p>
                        <p className="text-lg font-black leading-none">{fmtDay(d)}</p>
                        <p className="text-[10px] text-muted-foreground">{post.scheduled_time.substring(0, 5)}</p>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-xs font-bold capitalize">{post.niche}</span>
                          <span className="text-[10px] bg-background/40 px-1.5 py-0.5 rounded-full">{post.platform}</span>
                          <span className={`text-[10px] font-semibold ${STATUS_STYLES[post.status]}`}>
                            {STATUS_ICONS[post.status]} {post.status}
                          </span>
                        </div>
                        <p className="text-sm font-bold truncate">{post.title}</p>
                        <p className="text-xs text-muted-foreground truncate">"{post.hook}"</p>
                      </div>

                      {/* Desktop action buttons */}
                      <div className="hidden sm:flex items-center gap-1 shrink-0">
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => handleMarkPosted(post)}
                          className={`h-9 w-9 p-0 ${post.status === 'posted' ? 'text-green-400' : 'text-muted-foreground'}`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(post)} className="h-9 w-9 p-0">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => handleDelete(post.id)}
                          disabled={deletingId === post.id}
                          className="h-9 w-9 p-0 hover:text-destructive"
                        >
                          {deletingId === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>

                      {/* Mobile: ✓ + edit only (swipe handles delete) */}
                      <div className="flex sm:hidden items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleMarkPosted(post)}
                          className={`h-11 w-11 flex items-center justify-center rounded-xl transition-colors ${post.status === 'posted' ? 'text-green-400 bg-green-500/10' : 'text-muted-foreground'}`}
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => openEdit(post)}
                          className="h-11 w-11 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>
                  );

                  return (
                    <div key={post.id}>
                      {/* Swipe-to-delete on mobile */}
                      <div className="sm:hidden">
                        <SwipeToDelete onDelete={() => handleDelete(post.id)}>
                          {card}
                        </SwipeToDelete>
                        <p className="text-[10px] text-muted-foreground/40 text-right pr-1 mt-0.5">← swipe to delete</p>
                      </div>
                      {/* Desktop: plain card */}
                      <div className="hidden sm:block">{card}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optimal Posting Times */}
          <div className="glass-card p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="font-bold text-sm">Optimal Posting Times</h2>
              <span className="text-xs text-muted-foreground hidden sm:inline">({userTimezone})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PLATFORMS.map(platform => (
                <div key={platform} className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{platform}</p>
                  {OPTIMAL_TIMES[platform].map(slot => (
                    <div key={slot.label}>
                      <p className="text-[10px] text-muted-foreground mb-1">{slot.label}</p>
                      <div className="flex gap-1 flex-wrap">
                        {slot.times.map(t => (
                          <span key={t} className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground border-t border-border/30 pt-3">
              <Zap className="h-3 w-3 inline mr-1 text-primary" />
              Nigerian creators: Also post at 8–10pm WAT to catch US/UK evening audiences.
            </p>
          </div>

        </div>
      </div>

      {/* Schedule / Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg w-full max-h-[92vh] overflow-y-auto mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>{editPost ? 'Edit Scheduled Post' : 'Schedule New Post'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Title *</Label>
              <Input placeholder="e.g. Money mindset morning video" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-11" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Hook (first 2 seconds) *</Label>
              <Input placeholder="e.g. Nobody talks about this money secret..." value={form.hook} onChange={e => setForm(f => ({ ...f, hook: e.target.value }))} className="h-11" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Script <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea placeholder="Your 7–15 second video script..." value={form.script} onChange={e => setForm(f => ({ ...f, script: e.target.value }))} className="resize-none min-h-[72px]" rows={3} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Caption <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input placeholder="Caption for the post..." value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} className="h-11" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Hashtags <span className="text-muted-foreground font-normal">(space-separated)</span></Label>
              <Input placeholder="#fyp #viral #tiktok" value={form.hashtags} onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))} className="h-11" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Niche</Label>
                <Select value={form.niche} onValueChange={v => setForm(f => ({ ...f, niche: v }))}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{NICHES.map(n => <SelectItem key={n} value={n} className="capitalize">{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Platform</Label>
                <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Date</Label>
                <Input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Time</Label>
                <Input type="time" value={form.scheduled_time} onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))} className="h-11" />
              </div>
            </div>

            {/* Optimal time chips */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
              <p className="text-[11px] text-muted-foreground mb-2 font-semibold">
                <Zap className="h-3 w-3 inline mr-1 text-primary" />
                Suggested times for {form.platform}:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(OPTIMAL_TIMES[form.platform] ?? []).flatMap(slot => slot.times).map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, scheduled_time: t }))}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all min-h-[36px] font-semibold ${form.scheduled_time === t ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Status }))}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{STATUS_ICONS[s]} {s}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input placeholder="Any reminder..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-11" />
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1 h-11">
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarDays className="h-4 w-4 mr-2" />}
                {editPost ? 'Update' : 'Schedule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
