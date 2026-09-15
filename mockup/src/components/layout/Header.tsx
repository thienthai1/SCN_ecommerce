import { Bell, ShoppingCart, User } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.jpg";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  cartCount?: number;
  notificationCount?: number;
}

export const Header = ({ cartCount = 0, notificationCount = 0 }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md border-b border-border safe-top">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Logo and Business Name */}
        <Link to="/" className="flex items-center gap-2">
          <img 
            src={logo} 
            alt="Sachanon Textile" 
            className="w-9 h-9 rounded-lg object-contain bg-card shadow-sm"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground leading-tight">
              Sachanon
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              TEXTILE
            </span>
          </div>
        </Link>

        {/* Action Icons */}
        <div className="flex items-center gap-1">
          {/* Notification Bell */}
          <Link 
            to="/notifications" 
            className="relative p-2.5 rounded-full hover:bg-secondary transition-colors"
          >
            <Bell className="w-5 h-5 text-foreground" />
            {notificationCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] px-1 rounded-full"
              >
                {notificationCount > 9 ? "9+" : notificationCount}
              </Badge>
            )}
          </Link>

          {/* Cart */}
          <Link 
            to="/cart" 
            className="relative p-2.5 rounded-full hover:bg-secondary transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-foreground" />
            {cartCount > 0 && (
              <Badge 
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] px-1 rounded-full bg-primary"
              >
                {cartCount > 9 ? "9+" : cartCount}
              </Badge>
            )}
          </Link>

          {/* Profile */}
          <Link 
            to="/profile" 
            className="p-2.5 rounded-full hover:bg-secondary transition-colors"
          >
            <User className="w-5 h-5 text-foreground" />
          </Link>
        </div>
      </div>
    </header>
  );
};
