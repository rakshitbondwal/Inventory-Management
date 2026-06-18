import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import Product from "./Product.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/inventory";

// In-Memory Database fallback (with mock seeds for instant functionality without DB)
let inMemoryProducts = [
  { _id: "seed-1", name: "Wireless Mouse", sku: "WM-001", category: "Electronics", quantity: 50, price: 599, lowStockThreshold: 10, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "seed-2", name: "Office Chair", sku: "OC-002", category: "Furniture", quantity: 8, price: 4999, lowStockThreshold: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "seed-3", name: "Notebook Pack", sku: "NP-003", category: "Stationery", quantity: 3, price: 199, lowStockThreshold: 10, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "seed-4", name: "USB-C Cable", sku: "UC-004", category: "Electronics", quantity: 100, price: 299, lowStockThreshold: 20, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "seed-5", name: "Desk Lamp", sku: "DL-005", category: "Furniture", quantity: 2, price: 899, lowStockThreshold: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const isMongoConnected = () => mongoose.connection.readyState === 1;

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => {
    console.warn("MongoDB connection failed. Falling back to In-Memory store.");
    console.error(err.message);
  });

app.get("/", (req, res) => {
  res.json({ 
    status: "Inventory backend running",
    database: isMongoConnected() ? "MongoDB Cloud" : "In-Memory Store (Fallback)"
  });
});

app.get("/api/products", async (req, res) => {
  try {
    if (isMongoConnected()) {
      const products = await Product.find().sort({ createdAt: -1 });
      res.json(products);
    } else {
      const sorted = [...inMemoryProducts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.json(sorted);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const { name, sku, category, quantity, price, lowStockThreshold } = req.body;
    if (!name || !sku || !category || price === undefined) {
      return res.status(400).json({ error: "name, sku, category, and price are required" });
    }
    
    if (isMongoConnected()) {
      const product = new Product({
        name,
        sku,
        category,
        quantity: quantity || 0,
        price,
        lowStockThreshold: lowStockThreshold || 5,
      });
      await product.save();
      res.status(201).json(product);
    } else {
      const duplicate = inMemoryProducts.find(p => p.sku === sku);
      if (duplicate) {
        return res.status(400).json({ error: "SKU must be unique" });
      }
      const newProduct = {
        _id: Math.random().toString(36).substring(2, 9),
        name,
        sku,
        category,
        quantity: Number(quantity) || 0,
        price: Number(price),
        lowStockThreshold: Number(lowStockThreshold) || 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      inMemoryProducts.push(newProduct);
      res.status(201).json(newProduct);
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    if (isMongoConnected()) {
      const deleted = await Product.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Product not found" });
      res.json({ message: "Deleted successfully" });
    } else {
      const idx = inMemoryProducts.findIndex(p => p._id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "Product not found" });
      inMemoryProducts.splice(idx, 1);
      res.json({ message: "Deleted successfully" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    const { name, sku, category, quantity, price, lowStockThreshold } = req.body;
    
    if (isMongoConnected()) {
      const updated = await Product.findByIdAndUpdate(
        req.params.id,
        { name, sku, category, quantity: quantity || 0, price, lowStockThreshold: lowStockThreshold || 5 },
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: "Product not found" });
      res.json(updated);
    } else {
      const product = inMemoryProducts.find(p => p._id === req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found" });
      
      product.name = name || product.name;
      product.category = category || product.category;
      product.quantity = quantity !== undefined ? Number(quantity) : product.quantity;
      product.price = price !== undefined ? Number(price) : product.price;
      product.lowStockThreshold = lowStockThreshold !== undefined ? Number(lowStockThreshold) : product.lowStockThreshold;
      product.updatedAt = new Date().toISOString();
      
      res.json(product);
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/products/:id/adjust", async (req, res) => {
  try {
    const { change } = req.body;
    if (typeof change !== "number") {
      return res.status(400).json({ error: "change must be a number" });
    }
    
    if (isMongoConnected()) {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found" });

      product.quantity = Math.max(0, product.quantity + change);
      await product.save();
      res.json(product);
    } else {
      const product = inMemoryProducts.find(p => p._id === req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found" });
      
      product.quantity = Math.max(0, product.quantity + change);
      product.updatedAt = new Date().toISOString();
      res.json(product);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));