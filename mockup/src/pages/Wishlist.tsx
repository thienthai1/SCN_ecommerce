import { MobileLayout } from "@/components/layout/MobileLayout";
import { ProductCard } from "@/components/products/ProductCard";
import { Heart } from "lucide-react";

import bathTowel from "@/assets/bath-towel.jpg";
import catalog02 from "@/assets/catalog-02.png";
import towelGreen from "@/assets/towel-green.jpg";

const wishlistProducts = [
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

const Wishlist = () => {
  return (
    <MobileLayout>
      <div className="px-4 py-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-foreground">My Wishlist</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {wishlistProducts.length} items saved
          </p>
        </div>

        {/* Wishlist Grid */}
        {wishlistProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {wishlistProducts.map((product) => (
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
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium text-foreground">No saved items</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-[240px]">
              Tap the heart icon on products to save them here
            </p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default Wishlist;
