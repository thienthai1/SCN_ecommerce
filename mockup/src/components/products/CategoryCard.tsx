import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface CategoryCardProps {
  name: string;
  image: string;
  href: string;
  productCount?: number;
  className?: string;
}

export const CategoryCard = ({
  name,
  image,
  href,
  productCount,
  className,
}: CategoryCardProps) => {
  return (
    <Link
      to={href}
      className={cn(
        "group relative flex flex-col items-center rounded-xl overflow-hidden",
        className
      )}
    >
      {/* Image */}
      <div className="relative w-16 h-16 rounded-full overflow-hidden bg-secondary shadow-soft ring-2 ring-background group-hover:ring-primary/30 transition-all duration-300">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>

      {/* Label */}
      <div className="mt-2 text-center">
        <span className="text-xs font-medium text-foreground block">
          {name}
        </span>
        {productCount !== undefined && (
          <span className="text-[10px] text-muted-foreground">
            {productCount} items
          </span>
        )}
      </div>
    </Link>
  );
};
