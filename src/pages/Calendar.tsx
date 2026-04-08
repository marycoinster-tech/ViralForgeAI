import { useState, useEffect } from 'react';
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
  Trash2, Edit2, CheckCircle2, Loader2, Zap, X
} from 'lucide-react';

// ── Tiny date helpers (no dependency) ───────────────────────────────────────

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isSameDayFn(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function getWeekStart(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day; // Monday-based
  const result = new Date(d);
  result.setDate(d.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDaysFn(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(d.getDate() + n);
  return result;
}

function addWeeksFn(d: Date, n: number): Date {
  return addDaysFn(d, n * 7);
}

const SHORT_DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SHORT_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtShortDate(d: Date): string {
  return `${SHORT_MON[d.getMonth()]} ${d.getDate()}`;
}
function fmtYear(d: Date): string {
  return String(d.getFullYear());
}
function fmtDay(d: Date): number {
  return d.getDate();
}
function fmtDow(d: Date): string {
  // Monday=0 in our week layout
  const idx = (d.getDay() + 6) % 7;
  return SHORT_DAY[idx];
}

// ── Constants ────────────────────────────────────────────────────────────────

const NICHES = ['anime', 'motivation', 'money', 'dating', 'gym', 'ai & tech', 'storytime', 'fashion', 'gaming', 'beauty', 'food', 'travel', 'general'];
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

const STATUS_ICONS: Record<Status, string> = {
  scheduled: '📅',
  posted: '✅',
  draft: '📝',
};

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
  title: string;
  hook: string;
  script: string;
  caption: string;
  hashtags: string;
  niche: string;
  platform: string;
  scheduled_date: string;
  scheduled_time: string;
  status: Status;
  notes: string;
}

const DEFAULT_FORM: PostFormData = {
  title: '',
  hook: '',
  script: '',
  caption: '',
  hashtags: '',
  niche: 'general',
  platform: 'TikTok',
  scheduled_date: toYMD(new Date()),
  scheduled_time: '18:00',
  status: 'scheduled',
  notes: '',
};

// ── Component ────────────────────────────────────────────────────────────────

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
  const [userTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysFn(weekStart, i));

  useEffect(() => {
    if (user) loadPosts();
  }, [user, weekStart]);

  const loadPosts = async () => {
    setLoading(true);
    const start = toYMD(weekDays[0]);
    const end = toYMD(weekDays[6]);

    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .gte('scheduled_date', start)
      .lte('scheduled_date', end)
      .order('scheduled_time');

    if (error) {
      console.error('Failed to load posts:', error);
    } else {
      setPosts((data || []).map(p => ({ ...p, hashtags: p.hashtags || [] })));
    }
    setLoading(false);
  };

  const openNew = (day?: Date) => {
    setEditPost(null);
    setForm({
      ...DEFAULT_FORM,
      scheduled_date: day ? toYMD(day) : toYMD(new Date()),
    });
    setShowModal(true);
  };

  const openEdit = (post: ScheduledPost) => {
    setEditPost(post);
    setForm({
      title: post.title,
      hook: post.hook,
      script: post.script || '',
      caption: post.caption || '',
      hashtags: post.hashtags.join(' '),
      niche: post.niche,
      platform: post.platform,
      scheduled_date: post.scheduled_date,
      scheduled_time: post.scheduled_time.substring(0, 5),
      status: post.status,
      notes: post.notes || '',
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
      title: form.title.trim(),
      hook: form.hook.trim(),
      script: form.script.trim() || null,
      caption: form.caption.trim() || null,
      hashtags: form.hashtags.split(/\s+/).filter(Boolean),
      niche: form.niche,
      platform: form.platform,
      scheduled_date: form.scheduled_date,
      scheduled_time: form.scheduled_time + ':00',
      status: form.status,
      notes: form.notes.trim() || null,
    };

    if (editPost) {
      const { error } = await supabase.from('scheduled_posts').update(payload).eq('id', editPost.id);
      if (error) {
        toast({ title: 'Failed to update post', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Post updated!' });
        setShowModal(false);
        loadPosts();
      }
    } else {
      const { error } = await supabase.from('scheduled_posts').insert(payload);
      if (error) {
        toast({ title: 'Failed to save post', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Post scheduled! 🗓️' });
        setShowModal(false);
        loadPosts();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this scheduled post?')) return;
    setDeletingId(id);
    const { error } = await supabase.from('scheduled_posts').delete().eq('id', id);
    if (error) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
    } else {
      setPosts(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Post deleted' });
    }
    setDeletingId(null);
  };

  const handleMarkPosted = async (post: ScheduledPost) => {
    const newStatus: Status = post.status === 'posted' ? 'scheduled' : 'posted';
    const { error } = await supabase.from('scheduled_posts').update({ status: newStatus }).eq('id', post.id);
    if (!error) {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: newStatus } : p));
    }
  };

  const getPostsForDay = (day: Date) =>
    posts.filter(p => isSameDayFn(parseYMD(p.scheduled_date), day));

  const totalThisWeek = posts.length;
  const postedThisWeek = posts.filter(p => p.status === 'posted').length;

  const weekLabel = `${fmtShortDate(weekDays[0])} – ${fmtShortDate(weekDays[6])}, ${fmtYear(weekDays[6])}`;

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
                <CalendarDays className="h-3.5 w-3.5" />
                Content Calendar
              </div>
              <h1 className="text-2xl md:text-3xl font-black">
                Your <span className="text-gradient">Posting Schedule</span>
              </h1>
              <p className="text-muted-foreground text-sm">
                {userTimezone} · {totalThisWeek} posts this week · {postedThisWeek} posted
              </p>
            </div>
            <Button
              onClick={() => openNew()}
              className="shrink-0 gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Schedule Post
            </Button>
          </div>

          {/* Week Navigator + Grid */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => setWeekStart(w => addWeeksFn(w, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-bold">{weekLabel}</span>
              <Button variant="ghost" size="sm" onClick={() => setWeekStart(w => addWeeksFn(w, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map((day, i) => {
                  const dayPosts = getPostsForDay(day);
                  const isToday = isSameDayFn(day, new Date());

                  return (
                    <div key={i} className="flex flex-col min-h-[120px]">
                      {/* Day header */}
                      <button
                        onClick={() => openNew(day)}
                        className={`text-center py-2 px-1 rounded-lg mb-1.5 transition-all hover:bg-primary/10 ${
                          isToday ? 'bg-primary/10 border border-primary/30' : ''
                        }`}
                      >
                        <p className="text-[10px] text-muted-foreground font-medium uppercase">
                          {fmtDow(day)}
                        </p>
                        <p className={`text-lg font-black leading-none mt-0.5 ${isToday ? 'text-primary' : ''}`}>
                          {fmtDay(day)}
                        </p>
                      </button>

                      {/* Post pills */}
                      <div className="flex-1 space-y-1.5">
                        {dayPosts.map(post => (
                          <button
                            key={post.id}
                            onClick={() => openEdit(post)}
                            className={`w-full text-left p-1.5 rounded-md border text-[10px] leading-tight transition-all hover:scale-[1.02] ${
                              NICHE_COLORS[post.niche] || NICHE_COLORS.general
                            } ${post.status === 'posted' ? 'opacity-60' : ''}`}
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
                            className="w-full h-8 rounded-md border border-dashed border-border/30 text-[10px] text-muted-foreground/50 hover:border-primary/30 hover:text-primary/50 transition-all flex items-center justify-center"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sorted post list */}
          {posts.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">This Week's Posts</h2>
              <div className="space-y-2">
                {[...posts]
                  .sort((a, b) =>
                    `${a.scheduled_date}T${a.scheduled_time}`.localeCompare(`${b.scheduled_date}T${b.scheduled_time}`)
                  )
                  .map(post => {
                    const d = parseYMD(post.scheduled_date);
                    return (
                      <div
                        key={post.id}
                        className={`glass-card p-4 flex items-start gap-4 border ${
                          NICHE_COLORS[post.niche] || NICHE_COLORS.general
                        } ${post.status === 'posted' ? 'opacity-60' : ''}`}
                      >
                        <div className="shrink-0 text-center w-10">
                          <p className="text-xs text-muted-foreground">{fmtDow(d)}</p>
                          <p className="text-lg font-black leading-none">{fmtDay(d)}</p>
                          <p className="text-[10px] text-muted-foreground">{post.scheduled_time.substring(0, 5)}</p>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-bold capitalize">{post.niche}</span>
                            <span className="text-[10px] bg-background/40 px-2 py-0.5 rounded-full">{post.platform}</span>
                            <span className={`text-[10px] font-semibold ${STATUS_STYLES[post.status]}`}>
                              {STATUS_ICONS[post.status]} {post.status}
                            </span>
                          </div>
                          <p className="text-sm font-bold truncate mb-0.5">{post.title}</p>
                          <p className="text-xs text-muted-foreground truncate">"{post.hook}"</p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => handleMarkPosted(post)}
                            className={`h-8 w-8 p-0 ${post.status === 'posted' ? 'text-green-400' : 'text-muted-foreground'}`}
                            title={post.status === 'posted' ? 'Unmark' : 'Mark as posted'}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(post)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => handleDelete(post.id)}
                            disabled={deletingId === post.id}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            {deletingId === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Optimal Posting Times */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="font-bold text-sm">Optimal Posting Times</h2>
              <span className="text-xs text-muted-foreground">({userTimezone})</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {PLATFORMS.map(platform => (
                <div key={platform} className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{platform}</p>
                  {OPTIMAL_TIMES[platform].map(slot => (
                    <div key={slot.label}>
                      <p className="text-[10px] text-muted-foreground mb-1">{slot.label}</p>
                      <div className="flex gap-1 flex-wrap">
                        {slot.times.map(t => (
                          <span key={t} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
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
              Nigerian creators: Also post at 8–10pm WAT to catch US/UK evening audiences for global reach.
            </p>
          </div>
        </div>
      </div>

      {/* Schedule / Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editPost ? 'Edit Scheduled Post' : 'Schedule New Post'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Title *</Label>
              <Input placeholder="e.g. Money mindset morning video" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Hook (first 2 seconds) *</Label>
              <Input placeholder="e.g. Nobody talks about this money secret..." value={form.hook} onChange={e => setForm(f => ({ ...f, hook: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Script <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea placeholder="Your 7–15 second video script..." value={form.script} onChange={e => setForm(f => ({ ...f, script: e.target.value }))} className="resize-none min-h-[80px]" rows={3} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Caption <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input placeholder="Caption for the post..." value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Hashtags <span className="text-muted-foreground font-normal">(space-separated)</span></Label>
              <Input placeholder="#fyp #viral #tiktok" value={form.hashtags} onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Niche</Label>
                <Select value={form.niche} onValueChange={v => setForm(f => ({ ...f, niche: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{NICHES.map(n => <SelectItem key={n} value={n} className="capitalize">{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Platform</Label>
                <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Date</Label>
                <Input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Time</Label>
                <Input type="time" value={form.scheduled_time} onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))} />
              </div>
            </div>

            {/* Optimal time chips */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-[11px] text-muted-foreground mb-1.5 font-semibold">
                <Zap className="h-3 w-3 inline mr-1 text-primary" />
                Suggested times for {form.platform}:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(OPTIMAL_TIMES[form.platform] ?? []).flatMap(slot => slot.times).map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, scheduled_time: t }))}
                    className={`text-[11px] px-2 py-0.5 rounded-full transition-all ${
                      form.scheduled_time === t
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Status }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{STATUS_ICONS[s]} {s}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input placeholder="Any reminder..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90">
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
