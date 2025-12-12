import { Router } from "express";
import bcrypt from "bcryptjs";
import { authenticate, AuthRequest, requireRole } from "../middleware/auth";
import { generateSecurePassword, sendWelcomeEmail } from "../services/email";

const router = Router();

// Get all users (admin/manager only)
router.get(
  "/",
  authenticate,
  requireRole(["admin", "manager"]),
  async (req: AuthRequest, res) => {
    try {
      const users = await req.prisma.user.findMany({
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              sales: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get users",
      });
    }
  }
);

// Get single user
router.get(
  "/:id",
  authenticate,
  requireRole(["admin", "manager"]),
  async (req: AuthRequest, res) => {
    try {
      const user = await req.prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              sales: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get user",
      });
    }
  }
);

// Create new user (admin/manager only)
router.post(
  "/",
  authenticate,
  requireRole(["admin", "manager"]),
  async (req: AuthRequest, res) => {
    try {
      const { username, fullName, email, role } = req.body;

      // Validate required fields
      if (!username || !email) {
        return res.status(400).json({
          success: false,
          error: "Username and email are required",
        });
      }

      // Check if user already exists
      const existingUser = await req.prisma.user.findFirst({
        where: {
          OR: [{ username }, { email }],
        },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error:
            existingUser.username === username
              ? "Username already exists"
              : "Email already exists",
        });
      }

      // Only admin can create admin/manager users
      const currentUserRole = req.user!.role;
      const newUserRole = role || "cashier";

      if (
        currentUserRole === "manager" &&
        (newUserRole === "admin" || newUserRole === "manager")
      ) {
        return res.status(403).json({
          success: false,
          error: "Managers can only create cashier accounts",
        });
      }

      // Generate secure password
      const generatedPassword = generateSecurePassword(12);
      const passwordHash = await bcrypt.hash(generatedPassword, 10);

      const user = await req.prisma.user.create({
        data: {
          username,
          fullName: fullName || "",
          email,
          passwordHash,
          role: newUserRole,
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      // Send welcome email with credentials
      const emailSent = await sendWelcomeEmail({
        to: email,
        username,
        fullName: fullName || "",
        password: generatedPassword,
        role: newUserRole,
      });

      res.status(201).json({
        success: true,
        data: user,
        message: emailSent
          ? "User created successfully. Login credentials have been sent to their email."
          : "User created successfully. Email could not be sent - please provide credentials manually.",
        emailSent,
      });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create user",
      });
    }
  }
);

// Update user (admin/manager only)
router.put(
  "/:id",
  authenticate,
  requireRole(["admin", "manager"]),
  async (req: AuthRequest, res) => {
    try {
      const { username, fullName, email, password, role, isActive } = req.body;
      const userId = req.params.id;

      // Check if user exists
      const existingUser = await req.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Only admin can modify admin/manager users
      const currentUserRole = req.user!.role;
      if (
        currentUserRole === "manager" &&
        (existingUser.role === "admin" || existingUser.role === "manager")
      ) {
        return res.status(403).json({
          success: false,
          error: "Managers cannot modify admin or manager accounts",
        });
      }

      // Check for duplicate username/email
      if (username || email) {
        const duplicate = await req.prisma.user.findFirst({
          where: {
            AND: [
              { id: { not: userId } },
              {
                OR: [
                  username ? { username } : {},
                  email ? { email } : {},
                ].filter((obj) => Object.keys(obj).length > 0),
              },
            ],
          },
        });

        if (duplicate) {
          return res.status(400).json({
            success: false,
            error:
              duplicate.username === username
                ? "Username already exists"
                : "Email already exists",
          });
        }
      }

      // Build update data
      const updateData: Record<string, unknown> = {};
      if (username) updateData.username = username;
      if (fullName !== undefined) updateData.fullName = fullName;
      if (email) updateData.email = email;
      if (isActive !== undefined) updateData.isActive = isActive;

      // Only admin can change roles
      if (role && currentUserRole === "admin") {
        updateData.role = role;
      }

      // Update password if provided
      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }

      const user = await req.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update user",
      });
    }
  }
);

// Delete user (admin only, or manager for cashiers)
router.delete(
  "/:id",
  authenticate,
  requireRole(["admin", "manager"]),
  async (req: AuthRequest, res) => {
    try {
      const userId = req.params.id;

      // Cannot delete yourself
      if (userId === req.user!.id) {
        return res.status(400).json({
          success: false,
          error: "Cannot delete your own account",
        });
      }

      // Check if user exists
      const existingUser = await req.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Only admin can delete admin/manager users
      const currentUserRole = req.user!.role;
      if (
        currentUserRole === "manager" &&
        (existingUser.role === "admin" || existingUser.role === "manager")
      ) {
        return res.status(403).json({
          success: false,
          error: "Managers can only delete cashier accounts",
        });
      }

      // Check if user has sales (soft delete instead)
      const salesCount = await req.prisma.sale.count({
        where: { userId },
      });

      if (salesCount > 0) {
        // Soft delete - just deactivate
        await req.prisma.user.update({
          where: { id: userId },
          data: { isActive: false },
        });

        return res.json({
          success: true,
          message: "User deactivated (has sales history)",
        });
      }

      // Hard delete if no sales
      await req.prisma.user.delete({
        where: { id: userId },
      });

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete user",
      });
    }
  }
);

export default router;
