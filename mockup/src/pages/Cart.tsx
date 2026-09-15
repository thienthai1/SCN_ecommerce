import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";

import catalogImg1 from "@/assets/catalog-01.png";
import catalogImg2 from "@/assets/catalog-02.png";
import towelImg from "@/assets/bath-towel.jpg";

const cartItems = [
  {
    id: 1,
    name: "Premium Bath Towel Set",
    variant: "White / Large",
    price: 450,
    quantity: 2,
    image: towelImg,
  },
  {
    id: 2,
    name: "Luxury Bed Sheet",
    variant: "Cream / King Size",
    price: 1200,
    quantity: 1,
    image: catalogImg1,
  },
  {
    id: 3,
    name: "Cotton Pillowcase Set",
    variant: "Beige / Standard",
    price: 350,
    quantity: 3,
    image: catalogImg2,
  },
];

const Cart = () => {
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = 50;
  const total = subtotal + shipping;

  return (
    <MobileLayout>
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Shopping Cart</h1>
          <span className="text-sm text-muted-foreground">{cartItems.length} items</span>
        </div>

        {/* Cart Items */}
        <div className="space-y-3">
          {cartItems.map((item) => (
            <Card key={item.id} className="p-3">
              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground text-sm line-clamp-1">
                    {item.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.variant}</p>
                  <p className="text-sm font-semibold text-primary mt-1">
                    ฿{item.price.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-full"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-6 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-full"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold text-foreground">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">฿{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className="text-foreground">฿{shipping.toLocaleString()}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-semibold">
              <span className="text-foreground">Total</span>
              <span className="text-primary text-lg">฿{total.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Checkout Button */}
        <div className="space-y-2 pt-2">
          <Button className="w-full h-12 text-base font-medium">
            <ShoppingBag className="h-5 w-5 mr-2" />
            Proceed to Checkout
          </Button>
          <Link to="/browse">
            <Button variant="outline" className="w-full">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Cart;
