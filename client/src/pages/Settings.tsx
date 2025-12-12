import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  User,
  Lock,
  Shield,
  Edit2,
  X,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

export default function Settings() {
  const { user, setUser } = useAuthStore();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [profileForm, setProfileForm] = useState({
    username: user?.username || "",
    email: user?.email || "",
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post("/auth/change-password", data),
    onSuccess: () => {
      toast.success("Password changed successfully");
      setShowPasswordModal(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || "Failed to change password");
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: { username?: string; email?: string }) =>
      api.put("/auth/profile", data),
    onSuccess: (response) => {
      toast.success("Profile updated successfully");
      setUser(response.data.data);
      setShowProfileModal(false);
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || "Failed to update profile");
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.username.trim()) {
      toast.error("Username is required");
      return;
    }
    updateProfileMutation.mutate(profileForm);
  };

  const openProfileModal = () => {
    setProfileForm({
      username: user?.username || "",
      email: user?.email || "",
    });
    setShowProfileModal(true);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage your account settings
        </p>
      </div>

      {/* Profile Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Profile Information
            </h2>
          </div>
          <button
            onClick={openProfileModal}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
              Full Name
            </label>
            <p className="font-medium text-gray-900 dark:text-white">
              {user?.fullName || "-"}
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
              Username
            </label>
            <p className="font-medium text-gray-900 dark:text-white">
              {user?.username}
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
              Email
            </label>
            <p className="font-medium text-gray-900 dark:text-white">
              {user?.email || "-"}
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
              Role
            </label>
            <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm capitalize">
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Role Permissions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Role Permissions
          </h2>
        </div>
        <div className="space-y-3">
          {[
            {
              role: "Admin",
              permissions: [
                "Full system access",
                "User management",
                "Reports & Analytics",
                "All CRUD operations",
              ],
            },
            {
              role: "Manager",
              permissions: [
                "Product management",
                "Stock management",
                "View reports",
                "Process sales",
              ],
            },
            {
              role: "Cashier",
              permissions: [
                "Process sales",
                "View products",
                "Limited reports access",
              ],
            },
          ].map((r) => (
            <div
              key={r.role}
              className={`p-4 rounded-lg border dark:border-gray-700 ${
                user?.role === r.role.toLowerCase()
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30"
                  : "bg-white dark:bg-gray-800"
              }`}
            >
              <p className="font-medium text-gray-900 dark:text-white">
                {r.role}{" "}
                {user?.role === r.role.toLowerCase() && (
                  <span className="text-xs text-primary-600 dark:text-primary-400">
                    (Your role)
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {r.permissions.join(" • ")}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Security
          </h2>
        </div>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="px-4 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
          Change Password
        </button>
      </div>

      {/* App Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h2 className="font-semibold mb-4 text-gray-900 dark:text-white">
          About
        </h2>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <span className="text-gray-900 dark:text-white font-medium">
              Vendoa
            </span>{" "}
            v1.0.0
          </p>
          <p>A modern point of sale system for retail operations</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Built with React, Express, PostgreSQL, and Prisma
          </p>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Change Password
              </h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        currentPassword: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 pr-10 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 pr-10 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 pr-10 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    });
                  }}
                  className="px-4 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {changePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Edit Profile
              </h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleProfileSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Username
                </label>
                <input
                  type="text"
                  value={profileForm.username}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, username: e.target.value })
                  }
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, email: e.target.value })
                  }
                  placeholder="Enter your email"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
