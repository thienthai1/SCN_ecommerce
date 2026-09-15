import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

interface MobileLayoutProps {
  children: React.ReactNode;
  cartCount?: number;
  notificationCount?: number;
}

export const MobileLayout = ({ 
  children, 
  cartCount = 2, 
  notificationCount = 3 
}: MobileLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header cartCount={cartCount} notificationCount={notificationCount} />
      <main className="flex-1 pb-20 overflow-y-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};
