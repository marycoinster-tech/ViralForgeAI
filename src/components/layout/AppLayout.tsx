import { useState, ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 border-r border-border/50">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileNav onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
