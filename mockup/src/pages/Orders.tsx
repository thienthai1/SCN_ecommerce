import { MobileLayout } from "@/components/layout/MobileLayout";
import { Package, ChevronRight, Truck, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import catalog02 from "@/assets/catalog-02.png";
import bathTowel from "@/assets/bath-towel.jpg";

type OrderStatus = "pending" | "processing" | "shipped" | "delivered";

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
  image: string;
}

const orders: Order[] = [
  {
    id: "1",
    orderNumber: "ORD-2024-001",
    date: "Jan 20, 2025",
    status: "shipped",
    total: 2890,
    itemCount: 3,
    image: catalog02,
  },
  {
    id: "2",
    orderNumber: "ORD-2024-002",
    date: "Jan 18, 2025",
    status: "delivered",
    total: 15900,
    itemCount: 1,
    image: bathTowel,
  },
  {
    id: "3",
    orderNumber: "ORD-2024-003",
    date: "Jan 15, 2025",
    status: "processing",
    total: 4500,
    itemCount: 5,
    image: catalog02,
  },
];

const statusConfig: Record<OrderStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { 
    label: "Pending", 
    icon: Clock, 
    color: "text-warning bg-warning/10" 
  },
  processing: { 
    label: "Processing", 
    icon: Package, 
    color: "text-primary bg-primary/10" 
  },
  shipped: { 
    label: "Shipped", 
    icon: Truck, 
    color: "text-accent-foreground bg-accent" 
  },
  delivered: { 
    label: "Delivered", 
    icon: CheckCircle2, 
    color: "text-success bg-success/10" 
  },
};

const OrderCard = ({ order }: { order: Order }) => {
  const status = statusConfig[order.status];
  const StatusIcon = status.icon;

  return (
    <div className="bg-card rounded-xl p-4 shadow-card animate-fade-in">
      <div className="flex gap-3">
        {/* Order Image */}
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
          <img
            src={order.image}
            alt="Order items"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Order Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                {order.orderNumber}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {order.date} • {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
              status.color
            )}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
            <span className="text-sm font-semibold text-foreground">
              ฿{order.total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Orders = () => {
  return (
    <MobileLayout>
      <div className="px-4 py-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-foreground">My Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track and manage your orders
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
          {["All", "Processing", "Shipped", "Delivered"].map((tab, index) => (
            <button
              key={tab}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                index === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>

        {/* Empty State (hidden when there are orders) */}
        {orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium text-foreground">No orders yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-[240px]">
              When you place an order, it will appear here
            </p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default Orders;
