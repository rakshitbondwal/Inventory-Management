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

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.get("/", (req, res) => {
  res.json({ status: "Inventory backend running" });
});

app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
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
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    const { name, sku, category, quantity, price, lowStockThreshold } = req.body;
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { name, sku, category, quantity: quantity || 0, price, lowStockThreshold: lowStockThreshold || 5 },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Product not found" });
    res.json(updated);
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
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    product.quantity = Math.max(0, product.quantity + change);
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));