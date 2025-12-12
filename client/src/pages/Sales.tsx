import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { Loader2, Receipt, Eye } from "lucide-react";
import { useState } from "react";

export default function Sales() {
  const [selectedSale, setSelectedSale] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => (await api.get("/sales")).data.data,
  });

  const { data: saleDetails } = useQuery({
    queryKey: ["sale", selectedSale],
    queryFn: async () =>
      selectedSale ? (await api.get(`/sales/${selectedSale}`)).data.data : null,
    enabled: !!selectedSale,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Sales History
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          View all transactions
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : !data?.sales || data.sales.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p>No sales yet</p>
            <p className="text-sm mt-1">
              Complete a sale in POS to see it here
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300">
                  Receipt #
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300">
                  Payment
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-300">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-300">
                  Cashier
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {data.sales.map(
                (sale: {
                  id: string;
                  receiptNumber: string;
                  createdAt: string;
                  items: unknown[];
                  paymentMethod: string;
                  total: number;
                  user: { username: string; fullName?: string };
                }) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {sale.receiptNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {new Date(sale.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {sale.items.length} items
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 rounded-full capitalize text-gray-700 dark:text-gray-300">
                        {sale.paymentMethod.replace("_", "-")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                      ₱{Number(sale.total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                      {sale.user.fullName || sale.user.username}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedSale(sale.id)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg text-gray-600 dark:text-gray-300"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedSale && saleDetails && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedSale(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">
              Receipt #{saleDetails.receiptNumber}
            </h3>
            <div className="space-y-2 mb-4">
              {saleDetails.items.map(
                (item: {
                  id: string;
                  product: { name: string };
                  quantity: number;
                  priceAtSale: number;
                  subtotal: number;
                }) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span>
                      {item.product.name} x{item.quantity}
                    </span>
                    <span>₱{Number(item.subtotal).toFixed(2)}</span>
                  </div>
                )
              )}
            </div>
            <div className="border-t dark:border-gray-700 pt-4 space-y-2">
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Subtotal</span>
                <span>₱{Number(saleDetails.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Discount</span>
                <span>-₱{Number(saleDetails.discount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-gray-900 dark:text-white">
                <span>Total</span>
                <span>₱{Number(saleDetails.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>Paid</span>
                <span>₱{Number(saleDetails.amountPaid).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>Change</span>
                <span>₱{Number(saleDetails.change).toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedSale(null)}
              className="w-full mt-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
