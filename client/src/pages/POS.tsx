import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCartStore } from "../store/cartStore";
import api from "../services/api";
import toast from "react-hot-toast";

// Lazy load BarcodeScanner to prevent @zxing/library from crashing the page
const BarcodeScanner = lazy(() => import("../components/BarcodeScanner"));

import {
  Search,
  Camera,
  X,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Wallet,
  Loader2,
  CheckCircle,
  User,
  Receipt,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  stockQuantity: number;
  category?: { name: string };
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  creditBalance: number;
  creditLimit: number;
}

export default function POS() {
  const queryClient = useQueryClient();
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getSubtotal,
    getTotal,
  } = useCartStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "e_wallet" | "credit"
  >("cash");
  const [showCheckout, setShowCheckout] = useState(false);
  const [completedSale, setCompletedSale] = useState<{
    receiptNumber: string;
    total: number;
    change: number;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Customer selection for credit payments
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);

  // Focus search input on load
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Fetch products
  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsError,
  } = useQuery({
    queryKey: ["products", searchQuery],
    queryFn: async () => {
      const response = await api.get("/products", {
        params: { search: searchQuery, pageSize: 50 },
      });
      const products = response.data?.data?.products;
      return Array.isArray(products) ? (products as Product[]) : [];
    },
  });

  // Fetch customers for credit payment
  const { data: customersData } = useQuery({
    queryKey: ["customers", customerSearch],
    queryFn: async () => {
      const response = await api.get("/customers", {
        params: { search: customerSearch, pageSize: 20 },
      });
      const customers = response.data?.data?.customers;
      return Array.isArray(customers) ? (customers as Customer[]) : [];
    },
    enabled: showCustomerSearch || paymentMethod === "credit",
  });

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/sales", {
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          discount: item.discount,
        })),
        paymentMethod,
        amountPaid: paymentMethod === "credit" ? 0 : parseFloat(amountPaid),
        discount,
        customerId: selectedCustomer?.id,
      });
      return response.data.data;
    },
    onSuccess: (data) => {
      setCompletedSale({
        receiptNumber: data.receiptNumber,
        total: Number(data.total),
        change: Number(data.change),
      });
      clearCart();
      setDiscount(0);
      setAmountPaid("");
      setSelectedCustomer(null);
      setCustomerSearch("");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Checkout failed");
    },
  });

  // Handle barcode scan
  const handleBarcodeDetected = async (barcode: string) => {
    try {
      const response = await api.get(`/products/barcode/${barcode}`);
      const product = response.data.data;
      addItem(product);
      toast.success(`Added ${product.name}`);
      setShowScanner(false);
    } catch {
      toast.error("Product not found");
    }
  };

  // Open camera scanner
  const openScanner = () => {
    setShowScanner(true);
  };

  const handleAddProduct = (product: Product) => {
    try {
      addItem(product);
      toast.success(`Added ${product.name}`);
      setSearchQuery("");
      searchInputRef.current?.focus();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    const item = items.find((i) => i.product.id === productId);
    if (item) {
      try {
        updateQuantity(productId, item.quantity + delta);
      } catch (error) {
        toast.error((error as Error).message);
      }
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setShowCheckout(true);
    setAmountPaid(getTotal(discount).toFixed(2));
  };

  const handleConfirmPayment = () => {
    const total = getTotal(discount);

    // Credit payment validation
    if (paymentMethod === "credit") {
      if (!selectedCustomer) {
        toast.error("Please select a customer for credit payment");
        return;
      }
      const creditLimit = Number(selectedCustomer.creditLimit);
      const currentBalance = Number(selectedCustomer.creditBalance);
      if (creditLimit > 0 && currentBalance + total > creditLimit) {
        toast.error(
          `Credit limit exceeded. Limit: ₱${creditLimit.toFixed(
            2
          )}, Current balance: ₱${currentBalance.toFixed(2)}`
        );
        return;
      }
      checkoutMutation.mutate();
      return;
    }

    // Cash/Card/E-Wallet payment validation
    const paid = parseFloat(amountPaid);
    if (isNaN(paid) || paid < total) {
      toast.error("Insufficient payment amount");
      return;
    }

    checkoutMutation.mutate();
  };

  const subtotal = getSubtotal();
  const total = getTotal(discount);
  const change = parseFloat(amountPaid) - total;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Product Search & Grid */}
      <div className="flex flex-col flex-1 overflow-hidden bg-white shadow-sm dark:bg-gray-800 rounded-xl">
        {/* Search Bar */}
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name, SKU, or barcode..."
                className="w-full py-2 pl-10 pr-4 text-gray-900 bg-white border rounded-lg outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={openScanner}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 transition bg-gray-100 rounded-lg dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-gray-300 icon-animated"
            >
              <Camera className="w-5 h-5 transition-transform" />
              <span className="hidden sm:inline">Scan</span>
            </button>
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          {productsLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : productsError ? (
            <div className="flex items-center justify-center h-full text-red-500">
              <p>Failed to load products. Please try again.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {(Array.isArray(productsData) ? productsData : []).map(
                (product) => (
                  <button
                    key={product.id}
                    onClick={() => handleAddProduct(product)}
                    disabled={product.stockQuantity === 0}
                    className={`p-3 rounded-lg border dark:border-gray-600 text-left transition hover:shadow-md ${
                      product.stockQuantity === 0
                        ? "bg-gray-50 dark:bg-gray-700 opacity-50 cursor-not-allowed"
                        : "bg-white dark:bg-gray-700 hover:border-primary-500"
                    }`}
                  >
                    <p className="font-medium text-gray-900 truncate dark:text-white">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {product.sku}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                        ₱{Number(product.price).toFixed(2)}
                      </span>
                      <span
                        className={`text-xs ${
                          product.stockQuantity <= 10
                            ? "text-orange-500"
                            : "text-gray-400"
                        }`}
                      >
                        {product.stockQuantity} in stock
                      </span>
                    </div>
                  </button>
                )
              )}
              {(Array.isArray(productsData) ? productsData : []).length ===
                0 && (
                <div className="py-12 text-center text-gray-500 col-span-full dark:text-gray-400">
                  <p>No products found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="flex flex-col w-full bg-white shadow-sm lg:w-96 dark:bg-gray-800 rounded-xl">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Current Sale
          </h2>
        </div>

        {/* Cart Items */}
        <div className="flex-1 p-4 overflow-y-auto">
          {items.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              <p>Cart is empty</p>
              <p className="text-sm">Add products to start a sale</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate dark:text-white">
                      {item.product.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ₱{Number(item.product.price).toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuantityChange(item.product.id, -1)}
                      className="flex items-center justify-center w-8 h-8 text-gray-700 bg-white border rounded-lg dark:bg-gray-600 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-500 dark:text-gray-300 icon-click-bounce"
                    >
                      <Minus className="w-4 h-4 transition-transform" />
                    </button>
                    <span className="w-8 font-medium text-center text-gray-900 dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item.product.id, 1)}
                      className="flex items-center justify-center w-8 h-8 text-gray-700 bg-white border rounded-lg dark:bg-gray-600 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-500 dark:text-gray-300 icon-click-bounce"
                    >
                      <Plus className="w-4 h-4 transition-transform" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">
                      ₱
                      {(
                        Number(item.product.price) * item.quantity -
                        item.discount
                      ).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="text-red-500 hover:text-red-600 icon-hover-wiggle"
                    >
                      <Trash2 className="w-4 h-4 transition-transform" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Subtotal</span>
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
              <span>Discount</span>
              <input
                type="number"
                value={discount || ""}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1 text-right text-gray-900 bg-white border rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-between pt-2 text-lg font-bold text-gray-900 border-t dark:text-white dark:border-gray-600">
              <span>Total</span>
              <span>₱{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => clearCart()}
              disabled={items.length === 0}
              className="px-4 py-3 text-gray-700 transition border border-gray-300 rounded-lg dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 dark:text-gray-300"
            >
              Clear
            </button>
            <button
              onClick={handleCheckout}
              disabled={items.length === 0}
              className="flex-1 py-3 font-medium text-white transition rounded-lg bg-primary-500 hover:bg-primary-600 disabled:opacity-50"
            >
              Checkout
            </button>
          </div>
        </div>
      </div>

      {/* Scanner Modal - using camera-based barcode scanner */}
      {showScanner && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          }
        >
          <BarcodeScanner
            onScan={handleBarcodeDetected}
            onClose={() => setShowScanner(false)}
          />
        </Suspense>
      )}

      {/* Checkout Modal */}
      {showCheckout && !completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-white rounded-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Complete Payment</h3>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Payment Method */}
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: "cash", label: "Cash", icon: Banknote },
                    { value: "card", label: "Card", icon: CreditCard },
                    { value: "e_wallet", label: "E-Wallet", icon: Wallet },
                    { value: "credit", label: "Credit", icon: Receipt },
                  ].map((method) => (
                    <button
                      key={method.value}
                      onClick={() => {
                        setPaymentMethod(
                          method.value as
                            | "cash"
                            | "card"
                            | "e_wallet"
                            | "credit"
                        );
                        if (method.value !== "credit") {
                          setSelectedCustomer(null);
                        }
                      }}
                      className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition ${
                        paymentMethod === method.value
                          ? "border-primary-500 bg-primary-50 text-primary-600"
                          : "hover:border-gray-300"
                      }`}
                    >
                      <method.icon className="w-5 h-5" />
                      <span className="text-xs">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Selection for Credit */}
              {paymentMethod === "credit" && (
                <div className="mb-6">
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Select Customer <span className="text-red-500">*</span>
                  </label>
                  {selectedCustomer ? (
                    <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {selectedCustomer.name}
                          </p>
                          {selectedCustomer.phone && (
                            <p className="text-sm text-gray-500">
                              {selectedCustomer.phone}
                            </p>
                          )}
                          <div className="mt-1 text-sm">
                            <span className="text-gray-600">
                              Current Balance:{" "}
                            </span>
                            <span
                              className={`font-medium ${
                                Number(selectedCustomer.creditBalance) > 0
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              ₱
                              {Number(selectedCustomer.creditBalance).toFixed(
                                2
                              )}
                            </span>
                            {Number(selectedCustomer.creditLimit) > 0 && (
                              <span className="text-gray-500">
                                {" "}
                                / Limit: ₱
                                {Number(selectedCustomer.creditLimit).toFixed(
                                  2
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedCustomer(null)}
                          className="p-1 rounded hover:bg-blue-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          onFocus={() => setShowCustomerSearch(true)}
                          placeholder="Search customer by name or phone..."
                          className="w-full py-2 pl-10 pr-4 border rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      {showCustomerSearch &&
                        customersData &&
                        customersData.length > 0 && (
                          <div className="mt-2 overflow-y-auto border rounded-lg max-h-40">
                            {customersData.map((customer) => (
                              <button
                                key={customer.id}
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setShowCustomerSearch(false);
                                  setCustomerSearch("");
                                }}
                                className="w-full px-3 py-2 text-left border-b hover:bg-gray-50 last:border-b-0"
                              >
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-sm text-gray-500">
                                  {customer.phone || "No phone"} • Balance: ₱
                                  {Number(customer.creditBalance).toFixed(2)}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      {showCustomerSearch &&
                        (!customersData || customersData.length === 0) &&
                        customerSearch && (
                          <p className="py-2 mt-2 text-sm text-center text-gray-500">
                            No customers found
                          </p>
                        )}
                    </div>
                  )}
                </div>
              )}

              {/* Amount */}
              <div className="mb-6">
                <div className="flex justify-between mb-4 text-lg">
                  <span className="text-gray-600">Total Due:</span>
                  <span className="font-bold text-gray-900">
                    ₱{total.toFixed(2)}
                  </span>
                </div>

                {paymentMethod !== "credit" && (
                  <>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Amount Paid
                    </label>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="w-full px-4 py-3 text-lg font-medium border rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </>
                )}

                {paymentMethod === "credit" && selectedCustomer && (
                  <div className="p-3 border rounded-lg bg-amber-50 border-amber-200">
                    <p className="text-sm text-amber-800">
                      <strong>Note:</strong> This amount (₱{total.toFixed(2)})
                      will be added to {selectedCustomer.name}'s credit balance.
                    </p>
                    <p className="mt-1 text-sm text-amber-700">
                      New balance will be: ₱
                      {(Number(selectedCustomer.creditBalance) + total).toFixed(
                        2
                      )}
                    </p>
                  </div>
                )}

                {paymentMethod === "cash" && !isNaN(change) && change >= 0 && (
                  <div className="p-3 mt-4 rounded-lg bg-green-50">
                    <div className="flex justify-between text-lg">
                      <span className="text-green-700">Change:</span>
                      <span className="font-bold text-green-700">
                        ₱{change.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Amount Buttons */}
              {paymentMethod === "cash" && (
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {[20, 50, 100, 200, 500, 1000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setAmountPaid(amount.toString())}
                      className="py-2 font-medium border rounded-lg hover:bg-gray-50"
                    >
                      ₱{amount}
                    </button>
                  ))}
                  <button
                    onClick={() => setAmountPaid(total.toFixed(2))}
                    className="col-span-2 py-2 font-medium border rounded-lg hover:bg-gray-50"
                  >
                    Exact Amount
                  </button>
                </div>
              )}

              <button
                onClick={handleConfirmPayment}
                disabled={checkoutMutation.isPending}
                className="flex items-center justify-center w-full gap-2 py-3 font-medium text-white transition rounded-lg bg-primary-500 hover:bg-primary-600 disabled:opacity-50"
              >
                {checkoutMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Complete Sale"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md p-8 text-center bg-white rounded-xl">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-gray-900">
              Payment Complete!
            </h3>
            <p className="mb-6 text-gray-500">
              Receipt #{completedSale.receiptNumber}
            </p>

            <div className="p-4 mb-6 rounded-lg bg-gray-50">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Total Paid</span>
                <span className="font-medium">
                  ₱{(completedSale.total + completedSale.change).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold text-green-600">
                <span>Change</span>
                <span>₱{completedSale.change.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setCompletedSale(null);
                setShowCheckout(false);
                searchInputRef.current?.focus();
              }}
              className="w-full py-3 font-medium text-white transition rounded-lg bg-primary-500 hover:bg-primary-600"
            >
              New Sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
