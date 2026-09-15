import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category?: string;
  isNew?: boolean;
  className?: string;
}

export const ProductCard = ({
  id,
  name,
  price,
  originalPrice,
  image,
  category,
  isNew,
  className,
}: ProductCardProps) => {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const discount = originalPrice 
    ? Math.round(((originalPrice - price) / originalPrice) * 100) 
    : 0;

  return (
    <Link
      to={`/product/${id}`}
      className={cn(
        "group flex flex-col rounded-xl bg-card overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 animate-fade-in",
        className
      )}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isNew && (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground rounded-md">
              NEW
            </span>
          )}
          {discount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-destructive text-destructive-foreground rounded-md">
              -{discount}%
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsWishlisted(!isWishlisted);
          }}
          className="absolute top-2 right-2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-colors",
              isWishlisted 
                ? "fill-destructive text-destructive" 
                : "text-muted-foreground"
            )}
          />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1 p-3">
        {category && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            {category}
          </span>
        )}
        <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
          {name}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-semibold text-primary">
            ฿{price.toLocaleString()}
          </span>
          {originalPrice && (
            <span className="text-xs text-muted-foreground line-through">
              ฿{originalPrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
