import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

interface DashboardStats {
  todaySales: number;
  todayRevenue: number;
  todayTransactions: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalProducts: number;
  recentSales: Array<{
    id: string;
    receiptNumber: string;
    total: number;
    createdAt: string;
    user: { username: string; fullName?: string };
    _count: { items: number };
  }>;
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await api.get("/dashboard/stats");
      return response.data.data as DashboardStats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const stats = [
    {
      name: "Today's Revenue",
      value: data ? `₱${Number(data.todayRevenue).toFixed(2)}` : "₱0.00",
      icon: DollarSign,
      color: "bg-green-500",
      change: "+12%",
    },
    {
      name: "Transactions",
      value: data?.todayTransactions || 0,
      icon: ShoppingCart,
      color: "bg-blue-500",
      change: "+8%",
    },
    {
      name: "Total Products",
      value: data?.totalProducts || 0,
      icon: Package,
      color: "bg-purple-500",
    },
    {
      name: "Low Stock Alerts",
      value: (data?.lowStockCount || 0) + (data?.outOfStockCount || 0),
      icon: AlertTriangle,
      color: "bg-orange-500",
      alert: true,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Welcome back! Here's what's happening today.
          </p>
        </div>
        <Link
          to="/pos"
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition icon-animated"
        >
          <ShoppingCart className="w-5 h-5 transition-transform" />
          New Sale
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div
                className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center transition-transform hover:scale-110`}
              >
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              {stat.change && (
                <span className="flex items-center text-sm text-green-500 font-medium">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {stat.change}
                </span>
              )}
              {stat.alert && (stat.value as number) > 0 && (
                <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full">
                  Needs attention
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stat.name}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Link
              to="/pos"
              className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/30 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition icon-animated"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-primary-600 dark:text-primary-400 transition-transform" />
                <span className="font-medium text-primary-600 dark:text-primary-400">
                  Start New Sale
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-primary-600 dark:text-primary-400 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/products"
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition icon-animated"
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-gray-600 dark:text-gray-300 transition-transform" />
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  Manage Products
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 transition-transform" />
            </Link>
            <Link
              to="/stock"
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition icon-animated"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-300 transition-transform" />
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  Check Stock Levels
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Recent Sales */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Sales
            </h2>
            <Link
              to="/sales"
              className="text-sm text-primary-500 hover:text-primary-600"
            >
              View all
            </Link>
          </div>

          {data?.recentSales && data.recentSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                    <th className="pb-3 font-medium">Receipt #</th>
                    <th className="pb-3 font-medium">Items</th>
                    <th className="pb-3 font-medium">Total</th>
                    <th className="pb-3 font-medium">Cashier</th>
                    <th className="pb-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="border-b dark:border-gray-700 last:border-0"
                    >
                      <td className="py-3 font-medium text-gray-900 dark:text-white">
                        {sale.receiptNumber}
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-300">
                        {sale._count.items} items
                      </td>
                      <td className="py-3 font-medium text-gray-900 dark:text-white">
                        ₱{Number(sale.total).toFixed(2)}
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-300">
                        {sale.user.fullName || sale.user.username}
                      </td>
                      <td className="py-3 text-gray-500 dark:text-gray-400 text-sm">
                        {new Date(sale.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>No sales yet today</p>
              <Link
                to="/pos"
                className="text-primary-500 hover:text-primary-600 text-sm"
              >
                Start your first sale
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
