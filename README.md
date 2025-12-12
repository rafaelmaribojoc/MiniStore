<p align="center">
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind"/>
</p>

# 🛒 Vendoa

> A complete Point of Sale solution for small retail businesses — manage inventory, process sales, and track analytics all in one place.

**Vendoa** is a modern, full-stack web application designed to help small retail shops streamline their daily operations. Built as a **Progressive Web App (PWA)**, it works seamlessly on desktops, tablets, and mobile devices with optional camera-based barcode scanning.

---

## ✨ Key Features

| Feature                     | Description                                                                |
| --------------------------- | -------------------------------------------------------------------------- |
| 🛒 **Point of Sale**        | Fast checkout with real-time cart, discounts, and multiple payment methods |
| 📱 **Barcode Scanner**      | Use your phone's camera to scan products — no hardware needed              |
| 📦 **Inventory Management** | Track stock levels, receive shipments, and manage products                 |
| 📊 **Analytics Dashboard**  | Real-time insights on sales, revenue, and top products                     |
| 👥 **Multi-User Support**   | Role-based access for Admin, Manager, and Cashier                          |
| 🌐 **PWA Ready**            | Install on any device, works offline                                       |
| ☁️ **Cloud-Ready**          | Deploy anywhere for remote access and automatic backups                    |

---

## 🖥️ Screenshots

<details>
<summary>Click to view screenshots</summary>

### Dashboard

The main dashboard provides an overview of today's sales, transactions, and recent activity.

### POS Interface

Clean, intuitive checkout interface with product search and cart management.

### Inventory Management

Full CRUD operations for products, categories, and suppliers.

### Reports

Detailed analytics with charts and exportable data.

</details>

---

## 🛠️ Tech Stack

### Frontend

| Technology      | Purpose                |
| --------------- | ---------------------- |
| React 18        | UI Framework           |
| TypeScript      | Type Safety            |
| Vite            | Build Tool             |
| Tailwind CSS    | Styling                |
| Zustand         | State Management       |
| TanStack Query  | Server State & Caching |
| Recharts        | Data Visualization     |
| @zxing/library  | Barcode Scanning       |
| Vite PWA Plugin | Progressive Web App    |

### Backend

| Technology | Purpose          |
| ---------- | ---------------- |
| Node.js    | Runtime          |
| Express    | Web Framework    |
| TypeScript | Type Safety      |
| Prisma     | ORM              |
| PostgreSQL | Database         |
| JWT        | Authentication   |
| bcryptjs   | Password Hashing |

---

## 📁 Project Structure

```
vendoa/
├── client/                    # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   │   ├── Layout.tsx     # App layout with sidebar
│   │   │   └── BarcodeScanner.tsx
│   │   ├── pages/             # Route pages
│   │   │   ├── Dashboard.tsx
│   │   │   ├── POS.tsx
│   │   │   ├── Products.tsx
│   │   │   ├── Categories.tsx
│   │   │   ├── Suppliers.tsx
│   │   │   ├── Sales.tsx
│   │   │   ├── StockMovements.tsx
│   │   │   ├── Reports.tsx
│   │   │   └── Settings.tsx
│   │   ├── services/          # API client
│   │   └── store/             # Zustand stores
│   └── public/                # Static assets & PWA icons
│
├── server/                    # Backend (Express)
│   ├── src/
│   │   ├── routes/            # API endpoints
│   │   │   ├── auth.ts
│   │   │   ├── products.ts
│   │   │   ├── categories.ts
│   │   │   ├── suppliers.ts
│   │   │   ├── sales.ts
│   │   │   ├── stock.ts
│   │   │   ├── dashboard.ts
│   │   │   └── customers.ts
│   │   ├── middleware/        # Auth middleware
│   │   └── index.ts           # Server entry
│   └── prisma/
│       ├── schema.prisma      # Database schema
│       └── seed.ts            # Sample data
│
└── shared/                    # Shared TypeScript types
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **PostgreSQL** 14 or higher
- **npm** or **yarn**

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/vendoa.git
cd vendoa

# 2. Install all dependencies
npm install

# 3. Configure environment variables
cp server/.env.example server/.env
# Edit server/.env with your database credentials

# 4. Initialize the database
cd server
npx prisma migrate dev --name init
npx prisma db seed
cd ..

# 5. Start development servers
npm run dev
```

The app will be available at:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

### Environment Variables

Create `server/.env`:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/pos_db"

# Authentication
JWT_SECRET="your-secure-secret-key-min-32-characters"

# Server
PORT=3001
NODE_ENV=development
```

---

## 🔐 Default Credentials

After running the database seed, use these accounts to log in:

| Role        | Username  | Password     | Access Level                |
| ----------- | --------- | ------------ | --------------------------- |
| **Admin**   | `admin`   | `admin123`   | Full access to all features |
| **Manager** | `manager` | `manager123` | Inventory + Sales + Reports |
| **Cashier** | `cashier` | `cashier123` | POS only                    |

---

## 📱 Using the Barcode Scanner

Vendoa includes a **camera-based barcode scanner** — perfect for businesses without dedicated scanning hardware.

### How to Use:

1. Navigate to the **POS** page
2. Click the **📷 Scan** button
3. Grant camera permission when prompted
4. Point your device's camera at a product barcode
5. The product is automatically added to your cart!

### Supported Formats:

- EAN-13 / EAN-8
- UPC-A / UPC-E
- Code 128 / Code 39
- QR Code
- And more...

> 💡 **Tip:** For best results, ensure good lighting and hold the barcode steady.

---

## 📡 API Reference

All endpoints are prefixed with `/api`. Authentication required unless noted.

### Authentication

| Method | Endpoint                | Description                 |
| ------ | ----------------------- | --------------------------- |
| `POST` | `/auth/login`           | Login and receive JWT token |
| `GET`  | `/auth/me`              | Get current user profile    |
| `POST` | `/auth/change-password` | Update password             |

### Products

| Method   | Endpoint                  | Description                           |
| -------- | ------------------------- | ------------------------------------- |
| `GET`    | `/products`               | List products (paginated, searchable) |
| `POST`   | `/products`               | Create new product                    |
| `GET`    | `/products/:id`           | Get product details                   |
| `PUT`    | `/products/:id`           | Update product                        |
| `DELETE` | `/products/:id`           | Delete product                        |
| `GET`    | `/products/barcode/:code` | Find product by barcode               |

### Sales

| Method | Endpoint     | Description                 |
| ------ | ------------ | --------------------------- |
| `GET`  | `/sales`     | List all sales              |
| `POST` | `/sales`     | Process checkout            |
| `GET`  | `/sales/:id` | Get sale details with items |

### Inventory

| Method | Endpoint           | Description          |
| ------ | ------------------ | -------------------- |
| `GET`  | `/stock/movements` | View stock history   |
| `POST` | `/stock/receive`   | Record stock receipt |
| `POST` | `/stock/adjust`    | Adjust stock levels  |

### Analytics

| Method | Endpoint             | Description           |
| ------ | -------------------- | --------------------- |
| `GET`  | `/dashboard/stats`   | Dashboard statistics  |
| `GET`  | `/reports/sales`     | Sales report data     |
| `GET`  | `/reports/inventory` | Inventory report data |

---

## ☁️ Deployment

### Recommended Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │    Backend      │     │   Database      │
│   (Vercel)      │────▶│   (Railway)     │────▶│  (PostgreSQL)   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Platform Options

| Platform                      | Best For            | Pricing             |
| ----------------------------- | ------------------- | ------------------- |
| **Vercel** + **Railway**      | Quick deployment    | Free tier available |
| **DigitalOcean App Platform** | All-in-one solution | Starting $5/mo      |
| **AWS** (EC2 + RDS)           | Enterprise scale    | Pay as you go       |
| **Render**                    | Simple deployment   | Free tier available |

### Production Build

```bash
# Build frontend
cd client && npm run build

# Build backend
cd ../server && npm run build

# Start production server
npm start
```

### Production Environment Variables

```env
# Server
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
JWT_SECRET="your-production-secret-key-64-chars-recommended"
NODE_ENV=production
PORT=3001

# Client (at build time)
VITE_API_URL="https://api.yourdomain.com/api"
```

---

## 📜 Available Scripts

| Command                  | Description                                         |
| ------------------------ | --------------------------------------------------- |
| `npm run dev`            | Start both frontend and backend in development mode |
| `npm run dev:client`     | Start frontend only                                 |
| `npm run dev:server`     | Start backend only                                  |
| `npm run build`          | Build both for production                           |
| `npm run lint`           | Run ESLint on all packages                          |
| `npx prisma studio`      | Open Prisma database browser (from server/)         |
| `npx prisma migrate dev` | Create new migration (from server/)                 |
| `npx prisma db seed`     | Seed database with sample data (from server/)       |

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. Create a **feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. Open a **Pull Request**

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [React](https://react.dev/) — UI library
- [Tailwind CSS](https://tailwindcss.com/) — Styling framework
- [Prisma](https://www.prisma.io/) — Database ORM
- [ZXing](https://github.com/zxing-js/library) — Barcode scanning
- [Lucide Icons](https://lucide.dev/) — Beautiful icons

---

<p align="center">
  Made with ❤️ for small businesses everywhere
</p>
