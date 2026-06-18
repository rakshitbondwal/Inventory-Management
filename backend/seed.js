import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./Product.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/inventory";

const sampleProducts = [
  { name: "Wireless Mouse", sku: "WM-001", category: "Electronics", quantity: 50, price: 599, lowStockThreshold: 10 },
  { name: "Office Chair", sku: "OC-002", category: "Furniture", quantity: 8, price: 4999, lowStockThreshold: 5 },
  { name: "Notebook Pack", sku: "NP-003", category: "Stationery", quantity: 3, price: 199, lowStockThreshold: 10 },
  { name: "USB-C Cable", sku: "UC-004", category: "Electronics", quantity: 100, price: 299, lowStockThreshold: 20 },
  { name: "Desk Lamp", sku: "DL-005", category: "Furniture", quantity: 2, price: 899, lowStockThreshold: 5 },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected. Seeding...");
    await Product.deleteMany({});
    await Product.insertMany(sampleProducts);
    console.log("Seed complete!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();