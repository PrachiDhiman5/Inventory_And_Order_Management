# MERN Inventory & Order Management System with Precision Calculations

This project is a high-precision **Inventory and Order Management System** built using the **MERN** stack (**MongoDB Atlas**, **Express.js**, **React.js**, and **Node.js**). 

The application features strict **Role-Based Access Control (RBAC)** (Admin, Seller, Buyer) and a **precision unit conversion engine** accurate up to **5+ decimal places** using the `decimal.js` library to completely eliminate floating-point rounding errors.

---

## 🧭 System Architecture & Folder Structure

Here is a breakdown of the repository to help you understand where each piece of code lives and what it does.

```text
D:\Projects\Personal\Order_Mangement/
├── backend/
│   ├── models.js                 # ALL MongoDB schemas (User, Product, Order)
│   ├── server.js                 # Connection, Middleware, unit conversion math, and ALL API Endpoints
│   ├── seed.js                   # Script to clear database and seed default test data (users & products)
│   ├── .env                      # Secrets (JWT keys, MongoDB Atlas connection string, Admin credentials)
│   └── package.json              # Backend dependencies (express, mongoose, bcryptjs, jsonwebtoken, decimal.js)
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── Navbar.jsx        # Premium navigation bar handling user sessions
    │   ├── context/
    │   │   └── AuthContext.jsx   # Global authentication state provider (login, register, logout, localStorage)
    │   ├── pages/
    │   │   ├── Landing.jsx         # Public landing page with system features overview and routing CTA options
    │   │   ├── Login.jsx         # User login form
    │   │   ├── Register.jsx      # User signup form (select Buyer or Seller, plus company info)
    │   │   ├── AdminDashboard.jsx  # Admin controls: view user directories, audit calculations, manage catalog, update order status
    │   │   ├── SellerDashboard.jsx # Seller controls: manage own products, view own orders, update order status
    │   │   └── BuyerDashboard.jsx  # Buyer controls: browse products, real-time unit calculator, place quotes, check status
    │   ├── utils/
    │   │   ├── api.js            # Axios client configured to auto-inject JWT token into API headers
    │   │   └── conversion.js     # Frontend replica of unit conversion math using decimal.js
    │   ├── App.jsx               # Router assembly with Route Guards (protecting admin, seller, buyer routes)
    │   ├── main.jsx              # Mounts React application to DOM
    │   └── index.css             # Glassmorphic style tokens and layout systems
    ├── package.json              # Frontend dependencies (react, react-router-dom, axios, decimal.js)
    └── vite.config.js            # Vite build parameters
```

---

## 📈 Database Schema & Decimal128 Data Types

Standard numbers in databases are saved as binary floating-point numbers (`Double` or `Float`), which can result in rounding inaccuracies (e.g. `0.1 + 0.2 = 0.30000000000000004`). In inventory management and financial invoicing, this is unacceptable. 

Therefore, we use **MongoDB's Decimal128** type for numeric fields in Mongoose:

1. **`basePricePerUnit`**: Stored as a Decimal128 to represent the exact currency value in INR (e.g., `12500.45785`).
2. **`stockQuantity`**: Stored as a Decimal128 to allow fractional inventory amounts (e.g., `250.75000` grams or kilograms).
3. **Mongoose Serialization Hook**: MongoDB returns Decimal128 values as `{ $numberDecimal: "12.50000" }` in JSON, which is difficult for React to read. In the model (`model.js`), we added a `transform` block that automatically converts these numbers to raw strings (e.g., `"12.50000"`) when returning API data, making them ready to load into `decimal.js`.

---

## 📐 Unit Storage and Conversion Strategy

The system handles conversion across three physical dimensions:
* **Weight**: Base storage unit is `kg` (Kilogram). Allowed selection units: `kg`, `g` (grams).
* **Volume**: Base storage unit is `L` (Liter). Allowed selection units: `L`, `mL` (milliliters).
* **Count**: Base storage unit is `items` (Count). Allowed selection unit: `items`.

### Math Formula

When a buyer orders $Q$ amount in unit $U_1$, but the product is stored in base unit $U_2$ with a base price of $P$ per $U_2$:

$$\text{Conversion Factor} (F) = \frac{\text{Value of } 1 \text{ unit of } U_1 \text{ in terms of the base dimension}}{\text{Value of } 1 \text{ unit of } U_2 \text{ in terms of the base dimension}}$$

$$\text{Converted Quantity} (Q_c) = Q \times F$$

$$\text{Calculated Item Price} = Q_c \times P = Q \times F \times P$$

### Step-by-Step Examples

#### 1. Grams ($g$) to Kilograms ($kg$)
* **Base Unit**: `kg`
* **Base Price**: `₹12,500.45785 / kg`
* **Buyer Orders**: `250.55 g`
* **Conversion Factor ($g \rightarrow kg$)**: `0.001` (since $1\text{g} = 0.001\text{kg}$)
* **Converted Quantity**: $250.55 \times 0.001 = 0.25055\text{ kg}$
* **Calculated Cost**: $0.25055\text{ kg} \times 12,500.45785\text{ INR/kg} = 3131.98971303425\text{ INR}$
* **Truncated/Formatted**: Stored and displayed as `₹3,131.98971` (precise to 5 decimal places).

#### 2. Milliliters ($mL$) to Liters ($L$)
* **Base Unit**: `L`
* **Base Price**: `₹350.56000 / L`
* **Buyer Orders**: `750 mL`
* **Conversion Factor ($mL \rightarrow L$)**: `0.001` (since $1\text{mL} = 0.001\text{L}$)
* **Converted Quantity**: $750 \times 0.001 = 0.75000\text{ L}$
* **Calculated Cost**: $0.75000\text{ L} \times 350.56000\text{ INR/L} = 262.92000\text{ INR}$

### Precision Execution
Both the React client (`frontend/src/utils/conversion.js`) and Node backend (`backend/server.js`) execute math operations with **`decimal.js`** config:
```javascript
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });
```
This forces 20 digits of accuracy, rounding 0.5 upwards, ensuring calculations are identical on the frontend and backend.

---

## 🔑 Test Credentials

To log in and experience the role-based views and calculators, use the following credentials:

| Panel Role | Username / Email | Password | What they can do / Access |
| :--- | :--- | :--- | :--- |
| **🛡️ Admin** | `admin@example.com` | `admin123` | Audit logs, check detailed mathematical breakdowns of quotes, manage global product database, inspect buyer & seller profiles. |
| **💼 Seller** | `seller@example.com` | `seller123` | Manage own products (add, edit, delete), view and update status of orders placed on their products. Restricted from other sellers' data. |
| **🛒 Buyer** | `buyer@example.com` | `buyer123` | Search products, convert units in real-time, preview calculations, place orders/quotations, view order history. |

---

## 🏃 Local Startup Instructions

### 1. Configure and Run Backend
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Open `backend/.env` to see configuration details:
   - `PORT=5000` (Port the server runs on)
   - `MONGO_URI= (Your MongoDB Atlas connection string)`
   - `JWT_SECRET=(Key used to sign user authorization tokens)`
   - `ADMIN_EMAIL=(youradmin_email)`
   - `ADMIN_PASSWORD=(admin_password)`
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the seed script. This connects to MongoDB Atlas, clears previous entries, and inserts default test users and products:
   ```bash
   npm run seed
   ```
5. Start the Express API server:
   ```bash
   npm start
   ```
   *The server will start listening on `http://localhost:5000`.*

### 2. Configure and Run Frontend
1. Open a second terminal window and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The client interface will open at `http://localhost:5173`.*
