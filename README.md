# E-Commerce Platform (MERN Stack)

A full-stack e-commerce platform built with the MERN stack — React frontend with Tailwind CSS, Express.js backend with MongoDB, and JWT-based authentication.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)

## Features

**Customer**
- Product catalog with category & subcategory hierarchy
- Global navbar search with live suggestions + category-aware shop search
- Shopping cart, checkout, and order confirmation
- Order tracking with live status updates (Placed → Delivered) and actual shipped date
- Dedicated Return & Exchange page — request submission, admin approval, pickup scheduling (15-day window), refund/exchange tracking timeline
- Product reviews & ratings with rating summary
- Wishlist, user profile, and contact form

**Admin Panel**
- Product CRUD with multiple image uploads and image editing
- Category management displayed in parent → subcategory tree order
- All-orders table with customer details (email, phone, address), status management, and pickup scheduler
- Review management with per-product rating aggregation
- Success notifications for all create/update/delete actions

## Tech Stack

- **Frontend:** React 19, React Router, Tailwind CSS, Axios, Vite
- **Backend:** Node.js, Express.js, MongoDB, Mongoose
- **Auth:** JWT (JSON Web Tokens)
- **Media:** Cloudinary + Multer (multi-image product uploads)

## Project Structure

```
├── Backend/          # Express API — routes, models, middleware
│   ├── models/       # User, Product, Category, Order, Review
│   ├── routes/       # auth, product, category, order, review, user
│   └── middleware/   # auth, upload
└── Frontend/         # React app — pages, components, context
    └── src/
        ├── pages/    # Shop, ProductDetail, Cart, Admin, MyOrders...
        ├── components/
        ├── context/  # CartContext
        └── utils/    # sizeOptions (product-type aware sizing)
```

## Getting Started

### Backend
```bash
cd Backend
npm install
npm start          # runs on http://localhost:3000
```

### Frontend
```bash
cd Frontend
npm install
npm run dev        # runs on http://localhost:5173
```

## API Highlights

- `GET /product?q=` — search by title, description, and category name
- `POST /orders/:id/return` — return/exchange request (photo required, Cloudinary upload)
- `PUT /orders/:id/pickup` — schedule pickup (15-day limit, enforced server-side)
- `PUT /orders/:id/status` — admin status updates adjust expected ship/delivery dates
