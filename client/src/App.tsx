import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Suppliers from "./pages/Suppliers";
import Sales from "./pages/Sales";
import Credits from "./pages/Credits";
import StockMovements from "./pages/StockMovements";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin" && user?.role !== "manager") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="pos" element={<POS />} />
        <Route path="products" element={<Products />} />
        <Route path="categories" element={<Categories />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="sales" element={<Sales />} />
        <Route path="credits" element={<Credits />} />
        <Route path="stock" element={<StockMovements />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route
          path="users"
          element={
            <ManagerRoute>
              <UserManagement />
            </ManagerRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
