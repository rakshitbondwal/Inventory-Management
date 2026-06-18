# StockVault: Inventory Management System

StockVault is a modern, premium **Inventory Management System** designed for high usability and visual appeal. It features a complete dashboard layout with a left sidebar, real-time metrics cards, category filtering, instant search, dynamic status badges, stock adjustment buttons, and modals for creating and editing products.

The application is structured as a monorepo containing a **React (Vite) frontend** and an **Express (Mongoose) backend**, fully orchestrated using **Docker Compose** for a seamless setup experience.

---

## Key Features

- **Premium SaaS Dashboard UI**: Designed from the ground up to follow modern web aesthetics—featuring subtle transitions, clear typography, dynamic hover actions, and light/dark theme compatibility.
- **Dynamic Metrics Counter Grid**: Computes in-stock item quantities, low stock levels, expired products, and out-of-stock items dynamically.
- **Dynamic Category Mapping**: Maps categories to custom storage locations (e.g. *Freezer*, *Pantry*, *Tech Lab*, *Warehouse*) and assigns visual emoji icons (e.g. 🍅, 🍗, 🖱️) dynamically.
- **Full CRUD Interactivity**:
  - **Add Products**: Elegant modal popup form.
  - **Edit Details**: Interactive editing modal integrated with the backend API.
  - **Delete Products**: Secure item removal via the row menu dropdown.
  - **Quick Stock Adjust**: Instant increment (`+`) and decrement (`-`) buttons on hover.
- **Search & Filter**: Real-time filtering of inventory items by name, SKU, category, or status.

---

## Tech Stack

*   **Frontend**: React (v19), Vite (v8), Axios, Vanilla CSS.
*   **Backend**: Node.js, Express, Mongoose, Dotenv, CORS.
*   **Database**: MongoDB (v7).
*   **Orchestration**: Docker Compose.

---

## Getting Started

### Prerequisites
Make sure you have [Docker](https://www.docker.com/) and **Docker Compose** installed on your system.

### How to Run the System

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/rakshitbondwal/Inventory-Management.git
    cd Inventory-Management
    ```

2.  **Start all services**:
    Run the following command at the root of the project:
    ```bash
    docker compose up --build
    ```
    This command compiles the frontend, builds the backend, spins up a MongoDB container, and orchestrates them to run in harmony.

3.  **Access points**:
    *   **Frontend Interface**: [http://localhost:5173/](http://localhost:5173/)
    *   **Backend API Status**: [http://localhost:5000/](http://localhost:5000/)

---

## Populating Test Data (Seeding)

To seed the database with sample products (e.g. Wireless Mouse, Office Chair, Egg, Pasta, USB-C Cable), run the seed script inside the running backend container:

```bash
docker compose exec backend npm run seed
```

This will clear the existing collection and insert fresh sample data with varying stock levels so you can test alerts and features immediately.

---

## Directory Structure

```
inventory-system/
├── backend/
│   ├── Product.js          # Mongoose schema definition
│   ├── server.js           # Express application & REST API endpoints
│   ├── seed.js             # Seed script for dummy data
│   ├── Dockerfile          # Container configs for backend
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main dashboard layout and logic
│   │   ├── App.css         # Component styling and layout variables
│   │   ├── index.css       # Fonts and global resets
│   │   └── main.jsx        # App entry point
│   ├── index.html          # Shell layout page
│   ├── Dockerfile          # Dev server container setup
│   └── package.json
└── docker-compose.yml      # Orchestrates MongoDB, API, and Web App services
```

---

## API Endpoints Reference

The backend server exposes the following REST API endpoints at `http://localhost:5000/api`:

*   `GET /products` - Fetch all products (newest first).
*   `POST /products` - Create a new product.
*   `PUT /products/:id` - Update existing product properties.
*   `DELETE /products/:id` - Delete a product.
*   `POST /products/:id/adjust` - Adjust quantity levels dynamically (accepts `{ "change": number }` payloads).
