# MERN Inventory & Order Management System with Precision Calculations

This project is a high-precision **Inventory and Order Management System** built using the **MERN** stack (**MongoDB Atlas**, **Express.js**, **React.js**, and **Node.js**). 

The application features strict **Role-Based Access Control (RBAC)** (Admin, Seller, Buyer) and a **precision unit conversion engine** accurate up to **5+ decimal places** using the `decimal.js` library to completely eliminate floating-point rounding errors.

---

## 🧭 System Architecture & Folder Structure

Here is a breakdown of the repository to help you understand where each piece of code lives and what it does.

```text
D:\Projects\Personal\Order_Mangement/
├── backend/
│   ├── config/
│   │   └── db.js                 # Database configuration (Mongoose connection to MongoDB Atlas)
│   ├── controllers/
│   │   ├── authController.js     # Handles Login, Registration, and fetching users profiles
│   │   ├── productController.js  # CRUD (Create, Read, Update, Delete) operations for Products
│   │   └── orderController.js    # Logic for placing orders, calculating prices, and updating status
│   ├── middleware/
│   │   └── authMiddleware.js     # Route guards checking JWT token validity and User role permissions
│   ├── models/
│   │   ├── User.js               # Database schema for Users (Admin, Seller, Buyer)
│   │   ├── Product.js            # Database schema for Products (stores basePrice and stock as Decimal128)
│   │   └── Order.js              # Database schema for Orders/Quotations (snapshots calculations)
│   ├── routes/
│   │   ├── authRoutes.js         # Routes under `/api/auth` (Register, Login, profile, list users)
│   │   ├── productRoutes.js      # Routes under `/api/products` (CRUD products, role protected)
│   │   └── orderRoutes.js        # Routes under `/api/orders` (Place orders, audit calculations, update status)
│   ├── scripts/
│   │   └── seed.js               # Script to clear DB and insert default admin, buyer, seller, and sample products
│   ├── utils/
│   │   └── conversion.js         # High-precision unit conversion math using decimal.js
│   ├── .env                      # Secrets (JWT keys, MongoDB Atlas connection string, Admin credentials)
│   ├── package.json              # Backend dependencies (express, mongoose, bcryptjs, jsonwebtoken, decimal.js)
│   └── server.js                 # App entry point (Express setup, port listener, route bindings)
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx        # Premium navigation bar handling user sessions
    │   │   └── StatusBadge.jsx   # Visual indicator tag for User roles and Order statuses
    │   ├── context/
    │   │   └── AuthContext.jsx   # Global authentication state provider (login, register, logout, localStorage)
    │   ├── pages/
    │   │   ├── Login.jsx         # User login form
    │   │   ├── Register.jsx      # User signup form (select Buyer or Seller, plus company info)
    │   │   ├── AdminDashboard.jsx  # Admin controls: view user directories, audit quotation calculations, manage catalog
    │   │   ├── SellerDashboard.jsx # Seller controls: manage own products, view own orders, update status
    │   │   └── BuyerDashboard.jsx  # Buyer controls: browse products, real-time unit calculator, place quotes, check status
    │   ├── utils/
    │   │   ├── api.js            # Axios client configured to auto-inject JWT token into API headers
    │   │   └── conversion.js     # Frontend replica of unit conversion math using decimal.js
    │   ├── App.jsx               # Router assembly with Route Guards (protecting admin, seller, buyer routes)
    │   ├── main.jsx              # Mounts React application to DOM
    │   └── index.css             # Obsidian glassmorphic style tokens and layout systems
    ├── package.json              # Frontend dependencies (react, react-router-dom, axios, decimal.js, lucide-react)
    └── vite.config.js            # Vite build parameters
```

---

## 📈 Database Schema & Decimal128 Data Types

Standard numbers in databases are saved as binary floating-point numbers (`Double` or `Float`), which can result in rounding inaccuracies (e.g. `0.1 + 0.2 = 0.30000000000000004`). In inventory management and financial invoicing, this is unacceptable. 

Therefore, we use **MongoDB's Decimal128** type for numeric fields in Mongoose:

1. **`basePricePerUnit`**: Stored as a Decimal128 to represent the exact currency value in INR (e.g., `12500.45785`).
2. **`stockQuantity`**: Stored as a Decimal128 to allow fractional inventory amounts (e.g., `250.75000` grams or kilograms).
3. **Mongoose Serialization Hook**: MongoDB returns Decimal128 values as `{ $numberDecimal: "12.50000" }` in JSON, which is difficult for React to read. In the models (`User.js`, `Product.js`, `Order.js`), we added a `transform` block that automatically converts these numbers to raw strings (e.g., `"12.50000"`) when returning API data, making them ready to load into `decimal.js`.

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
Both the React client (`frontend/src/utils/conversion.js`) and Node backend (`backend/utils/conversion.js`) execute math operations with **`decimal.js`** config:
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
   - `MONGO_URI=mongodb+srv://prachi:prachi123@prachi.qgnrwq0.mongodb.net/?appName=Prachi` (Your MongoDB Atlas connection string)
   - `JWT_SECRET=supersecretjwtkey12345!` (Key used to sign user authorization tokens)
   - `ADMIN_EMAIL=admin@example.com`
   - `ADMIN_PASSWORD=admin123`
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

---

## 🧑‍🏫 Oral Defense Guide: How to Explain the Flows

If you need to defend this project or explain how MERN works to an interviewer, here is your cheat sheet:

### 1. The Request Lifecycle (Flow of placing an Order)
When a Buyer clicks **"Submit Quotation"** on the UI, what happens step-by-step?
1. **React State Capture**: The Buyer inputs `orderedQuantity` and chooses `orderedUnit` (e.g. `g`).
2. **Frontend Estimation**: The frontend utilizes `frontend/src/utils/conversion.js` (relying on `decimal.js`) to show a real-time price preview to the user.
3. **Axios Dispatch**: The browser fires an HTTP POST request to `/api/orders` carrying the payload `[{ productId, orderedQuantity, orderedUnit }]`. Axios attaches the JWT token from `localStorage` into the `Authorization: Bearer <TOKEN>` header.
4. **Express Routing**: The backend server receives the request. It matches the route `/api/orders` in `backend/routes/orderRoutes.js`.
5. **Auth Verification**: The request passes through the `protect` middleware in `backend/middleware/authMiddleware.js`. It decodes the JWT token, confirms it is valid, fetches the user object from MongoDB (excluding the password), and appends it to `req.user`.
6. **Controller Logic**: The request hits the `createOrder` controller in `backend/controllers/orderController.js`:
   - It loops through the items.
   - For each item, it pulls the actual product configuration from the database.
   - It performs the conversion math using `backend/utils/conversion.js` and `decimal.js`.
   - It stores the snapshot parameters (basePrice, baseUnit, conversionFactor, calculatedPrice) in the Order Schema to avoid problems if the product price changes in the future.
   - It writes the order document into MongoDB Atlas.
7. **JSON Response**: Express returns a status code of `201 Created` back to React, which updates the UI.

---

### 2. Interview Q&A (Common Technical Questions)

#### Q: How does Role-Based Access Control (RBAC) work in your project?
* **Answer**: "We handle authentication using **JWT (JSON Web Tokens)**. When a user logs in, the backend signs a token containing their User ID and returns it. The frontend stores this token and sends it in the `Authorization` header. On the backend, we write a middleware function called `authorize(...roles)`. This middleware wraps our routes and checks the role parameter stored in `req.user` (which is populated from the token database lookup). If a user's role is not included in the allowed list, the backend blocks the request with a `403 Forbidden` status code."

#### Q: How did you implement high-precision calculations?
* **Answer**: "JavaScript numbers are standard 64-bit floating points which have rounding issues (like `0.1 + 0.2 = 0.30000000000000004`). In order to maintain precision up to 5+ decimal places for weight and price math:
  1. On the **Frontend** and **Backend**, we perform all mathematical calculations using the `decimal.js` library, which implements arbitrary-precision arithmetic.
  2. In **MongoDB**, we use the `Decimal128` data type for schema fields like pricing and stock. This stores the values as exact decimal structures rather than binary floats.
  3. When transferring data through APIs, Mongoose automatically serializes these fields to strings, which are then fed directly into `decimal.js` on the React side."

#### Q: What happens to the stock when an order is placed?
* **Answer**: "When a buyer submits an order, it is initially saved with a status of `pending`. At this stage, no inventory is deducted. When an **Admin** or the **assigned Seller** updates the order status to `approved`, the backend automatically:
  1. Converted the ordered quantity to the product's base storage unit (e.g. `g` to `kg`).
  2. Subtracts the converted quantity from the product's `stockQuantity` in the database.
  If the order is subsequently rejected or reverted to pending, the backend reverses the transaction and restores the deducted stock."

#### Q: What is the benefit of snapshotting fields in the Order schema?
* **Answer**: "If a Seller updates a product's price or base unit in the future, it shouldn't modify historical orders. Therefore, in the `OrderItemSchema`, we snapshot the product's `productName`, `basePricePerUnit`, `baseUnit`, and the computed `conversionFactor` at the exact moment the order is placed. This protects invoice data integrity."
