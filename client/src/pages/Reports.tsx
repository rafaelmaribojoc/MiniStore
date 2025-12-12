import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import {
  Loader2,
  Download,
  TrendingUp,
  Package,
  DollarSign,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export default function Reports() {
  const [period, setPeriod] = useState("30");
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(
    Date.now() - parseInt(period) * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .split("T")[0];

  const { data: salesReport, isLoading: salesLoading } = useQuery({
    queryKey: ["sales-report", period],
    queryFn: async () =>
      (
        await api.get(
          `/dashboard/reports/sales?startDate=${startDate}&endDate=${endDate}`
        )
      ).data.data,
  });

  const { data: inventoryReport, isLoading: inventoryLoading } = useQuery({
    queryKey: ["inventory-report"],
    queryFn: async () =>
      (await api.get("/dashboard/reports/inventory")).data.data,
  });

  const exportToCSV = () => {
    if (!salesReport?.salesByDate) return;
    const csv =
      "Date,Sales,Revenue\n" +
      salesReport.salesByDate
        .map(
          (d: { date: string; count: number; total: number }) =>
            `${d.date},${d.count},${d.total}`
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${startDate}-${endDate}.csv`;
    a.click();
  };

  const isLoading = salesLoading || inventoryLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Reports
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Business analytics and insights
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            <Download className="w-5 h-5" /> Export CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Total Revenue
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    ₱{Number(salesReport?.totalRevenue || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Total Profit
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    ₱{Number(salesReport?.totalProfit || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Total Sales
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {salesReport?.totalSales || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Avg Order Value
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    ₱{Number(salesReport?.averageOrderValue || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">
                Sales Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesReport?.salesByDate || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">
                Top Selling Products
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={inventoryReport?.topSellingProducts?.slice(0, 5) || []}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    dataKey="product.name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar dataKey="quantitySold" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Inventory Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">
              Inventory Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {inventoryReport?.totalProducts || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Products
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">
                  ₱{Number(inventoryReport?.totalStockValue || 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Stock Value (Cost)
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-600">
                  {inventoryReport?.lowStockProducts?.length || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Low Stock Items
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold text-red-600">
                  {inventoryReport?.outOfStockProducts?.length || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Out of Stock
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
