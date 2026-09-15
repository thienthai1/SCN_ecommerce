import { MobileLayout } from "@/components/layout/MobileLayout";
import { ProductCard } from "@/components/products/ProductCard";
import { CategoryCard } from "@/components/products/CategoryCard";
import { ChevronRight, Search } from "lucide-react";
import { Link } from "react-router-dom";

// Import images
import bathTowel from "@/assets/bath-towel.jpg";
import bedHero from "@/assets/bed-hero.png";
import catalog01 from "@/assets/catalog-01.png";
import catalog02 from "@/assets/catalog-02.png";
import catalog03 from "@/assets/catalog-03.png";
import towelGreen from "@/assets/towel-green.jpg";
import rolledTowel from "@/assets/rolled-towel.jpeg";
import bedroom from "@/assets/bedroom.png";

// Mock data
const categories = [
  { id: "1", name: "Towels", image: catalog02, href: "/category/towels", count: 24 },
  { id: "2", name: "Bedding", image: catalog03, href: "/category/bedding", count: 18 },
  { id: "3", name: "Robes", image: catalog01, href: "/category/robes", count: 12 },
  { id: "4", name: "Linens", image: bedroom, href: "/category/linens", count: 30 },
];

const featuredProducts = [
  {
    id: "1",
    name: "Premium White Bath Towel Set",
    price: 890,
    originalPrice: 1200,
    image: bathTowel,
    category: "Towels",
    isNew: true,
  },
  {
    id: "2",
    name: "Luxury King Bed Frame",
    price: 15900,
    image: bedHero,
    category: "Bedding",
  },
  {
    id: "3",
    name: "Pool Side Towel Stack",
    price: 1450,
    originalPrice: 1800,
    image: catalog02,
    category: "Towels",
  },
  {
    id: "4",
    name: "Hotel Suite Towel Set",
    price: 2100,
    image: towelGreen,
    category: "Towels",
    isNew: true,
  },
];

const newArrivals = [
  {
    id: "5",
    name: "Spa Rolled Towel Collection",
    price: 750,
    image: rolledTowel,
    category: "Spa",
    isNew: true,
  },
  {
    id: "6",
    name: "Swan Decoration Bed Set",
    price: 8900,
    originalPrice: 12000,
    image: catalog03,
    category: "Bedding",
  },
];

const Index = () => {
  return (
    <MobileLayout>
      {/* Search Bar */}
      <div className="px-4 pt-4 pb-2">
        <Link 
          to="/browse" 
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-secondary/80 text-muted-foreground transition-colors hover:bg-secondary"
        >
          <Search className="w-4 h-4" />
          <span className="text-sm">Search products...</span>
        </Link>
      </div>

      {/* Hero Banner */}
      <section className="px-4 py-3">
        <div className="relative rounded-2xl overflow-hidden bg-primary/5">
          <div className="absolute inset-0 gradient-hero opacity-90" />
          <img 
            src={bedroom} 
            alt="Premium Hotel Textiles" 
            className="w-full h-40 object-cover mix-blend-overlay"
          />
          <div className="absolute inset-0 flex flex-col justify-center px-5">
            <span className="text-xs font-medium text-primary-foreground/80 uppercase tracking-wider">
              Premium Quality
            </span>
            <h1 className="text-xl font-bold text-primary-foreground mt-1">
              Hotel Textiles
            </h1>
            <p className="text-xs text-primary-foreground/80 mt-1 max-w-[180px]">
              Luxury linens for hospitality excellence
            </p>
            <Link 
              to="/browse" 
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-foreground bg-background/20 backdrop-blur-sm px-3 py-1.5 rounded-lg w-fit hover:bg-background/30 transition-colors"
            >
              Shop Now
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-4">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-base font-semibold text-foreground">Categories</h2>
          <Link 
            to="/categories" 
            className="text-xs text-primary font-medium flex items-center gap-0.5"
          >
            View All
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex gap-4 px-4 overflow-x-auto scrollbar-hide pb-2">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              name={category.name}
              image={category.image}
              href={category.href}
              productCount={category.count}
            />
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-4">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-base font-semibold text-foreground">Featured</h2>
          <Link 
            to="/featured" 
            className="text-xs text-primary font-medium flex items-center gap-0.5"
          >
            See All
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 px-4">
          {featuredProducts.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              originalPrice={product.originalPrice}
              image={product.image}
              category={product.category}
              isNew={product.isNew}
            />
          ))}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-4 pb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-base font-semibold text-foreground">New Arrivals</h2>
          <Link 
            to="/new" 
            className="text-xs text-primary font-medium flex items-center gap-0.5"
          >
            See All
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 px-4">
          {newArrivals.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              originalPrice={product.originalPrice}
              image={product.image}
              category={product.category}
              isNew={product.isNew}
            />
          ))}
        </div>
      </section>
    </MobileLayout>
  );
};

export default Index;
