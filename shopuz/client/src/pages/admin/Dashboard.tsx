import { motion } from "framer-motion";
import { ShoppingCart, Users, TrendingUp, Clock, Package, CheckCircle } from "lucide-react";
import { useGetDashboardStats, getGetDashboardStatsQueryKey, useGetOrdersByStatus, getGetOrdersByStatusQueryKey, useGetRecentOrders, getGetRecentOrdersQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#3B82F6", "#F97316", "#22C55E", "#EF4444"];

const STATUS_LABELS: Record<string, string> = {
  new: "Yangi",
  preparing: "Tayyorlanmoqda",
  delivered: "Yetkazildi",
  cancelled: "Bekor qilindi",
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });
  const { data: ordersByStatus } = useGetOrdersByStatus({ query: { queryKey: getGetOrdersByStatusQueryKey() } });
  const { data: recentOrders } = useGetRecentOrders({ query: { queryKey: getGetRecentOrdersQueryKey() } });

  const statCards = [
    { label: "Jami buyurtmalar", value: stats?.totalOrders ?? 0, icon: ShoppingCart, color: "text-blue-600 bg-blue-50" },
    { label: "Jami mijozlar", value: stats?.totalCustomers ?? 0, icon: Users, color: "text-purple-600 bg-purple-50" },
    { label: "Jami daromad", value: `${(stats?.totalRevenue ?? 0).toLocaleString()} so'm`, icon: TrendingUp, color: "text-green-600 bg-green-50" },
    { label: "Yangi buyurtmalar", value: stats?.newOrders ?? 0, icon: Clock, color: "text-orange-600 bg-orange-50" },
    { label: "Tayyorlanmoqda", value: stats?.preparingOrders ?? 0, icon: Package, color: "text-yellow-600 bg-yellow-50" },
    { label: "Yetkazildi", value: stats?.deliveredOrders ?? 0, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
  ];

  const pieData = ordersByStatus?.map(s => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: s.count,
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Bugun: {new Date().toLocaleDateString("uz-UZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm"
              data-testid={`stat-card-${i}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              {statsLoading ? (
                <Skeleton className="w-16 h-6 mb-1" />
              ) : (
                <p className="text-2xl font-bold">{card.value}</p>
              )}
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        {pieData.length > 0 && (
          <div className="bg-card rounded-2xl p-5 border border-border/50">
            <h3 className="font-bold mb-4">Buyurtmalar holati</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Today's Stats */}
        <div className="bg-card rounded-2xl p-5 border border-border/50">
          <h3 className="font-bold mb-4">Bugungi ko'rsatkichlar</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Buyurtmalar</span>
              <span className="font-bold text-lg">{stats?.todayOrders ?? 0}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Daromad</span>
              <span className="font-bold text-lg text-green-600">{(stats?.todayRevenue ?? 0).toLocaleString()} so'm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      {recentOrders && recentOrders.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/50">
          <div className="p-5 border-b border-border">
            <h3 className="font-bold">So'nggi buyurtmalar</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">#</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Mijoz</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Summa</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Holat</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.slice(0, 5).map(order => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors" data-testid={`recent-order-${order.id}`}>
                    <td className="px-5 py-3 font-medium">#{order.id}</td>
                    <td className="px-5 py-3">{order.customerName || order.customerPhone || "—"}</td>
                    <td className="px-5 py-3">{(order.totalPrice as number).toLocaleString()} so'm</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        order.status === "new" ? "bg-blue-100 text-blue-700" :
                        order.status === "preparing" ? "bg-orange-100 text-orange-700" :
                        order.status === "delivered" ? "bg-green-100 text-green-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
