import { MobileLayout } from "@/components/layout/MobileLayout";
import { 
  User, 
  MapPin, 
  CreditCard, 
  Heart, 
  Settings, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Package
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: Package, label: "My Orders", href: "/orders", count: 3 },
  { icon: MapPin, label: "Shipping Address", href: "/addresses" },
  { icon: CreditCard, label: "Payment Methods", href: "/payments" },
  { icon: Heart, label: "Wishlist", href: "/wishlist", count: 5 },
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: HelpCircle, label: "Help & Support", href: "/help" },
];

const Profile = () => {
  return (
    <MobileLayout>
      <div className="px-4 py-4">
        {/* Profile Header */}
        <div className="flex items-center gap-4 p-4 bg-card rounded-xl shadow-card mb-6 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">Guest User</h1>
            <p className="text-sm text-muted-foreground">guest@example.com</p>
            <Link 
              to="/edit-profile"
              className="text-xs text-primary font-medium mt-1 inline-block"
            >
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Orders", value: "12" },
            { label: "Wishlist", value: "5" },
            { label: "Reviews", value: "8" },
          ].map((stat) => (
            <div 
              key={stat.label}
              className="bg-card rounded-xl p-3 text-center shadow-soft animate-fade-in"
            >
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Menu Items */}
        <div className="bg-card rounded-xl shadow-card overflow-hidden animate-fade-in">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors",
                  index !== menuItems.length - 1 && "border-b border-border"
                )}
              >
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <Icon className="w-4 h-4 text-foreground" />
                </div>
                <span className="flex-1 text-sm font-medium text-foreground">
                  {item.label}
                </span>
                {item.count !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                    {item.count}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>

        {/* Logout Button */}
        <button className="flex items-center justify-center gap-2 w-full mt-6 py-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors">
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Log Out</span>
        </button>

        {/* Version */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Version 1.0.0
        </p>
      </div>
    </MobileLayout>
  );
};

export default Profile;
