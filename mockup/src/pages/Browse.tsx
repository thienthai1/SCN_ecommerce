import { MobileLayout } from "@/components/layout/MobileLayout";
import { ProductCard } from "@/components/products/ProductCard";
import { Search, SlidersHorizontal } from "lucide-react";

import bathTowel from "@/assets/bath-towel.jpg";
import bedHero from "@/assets/bed-hero.png";
import catalog01 from "@/assets/catalog-01.png";
import catalog02 from "@/assets/catalog-02.png";
import catalog03 from "@/assets/catalog-03.png";
import towelGreen from "@/assets/towel-green.jpg";

const allProducts = [
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
  {
    id: "5",
    name: "Premium Bathrobe White",
    price: 2500,
    image: catalog01,
    category: "Robes",
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

const Browse = () => {
  return (
    <MobileLayout>
      <div className="px-4 py-4">
        {/* Search Header */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-secondary/80">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
          <button className="p-2.5 rounded-xl bg-secondary/80 hover:bg-secondary transition-colors">
            <SlidersHorizontal className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{allProducts.length}</span> products found
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 gap-3">
          {allProducts.map((product) => (
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
      </div>
    </MobileLayout>
  );
};

export default Browse;
