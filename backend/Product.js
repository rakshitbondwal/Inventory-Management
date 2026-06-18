import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    price: { type: Number, required: true },
    lowStockThreshold: { type: Number, required: true, default: 5 },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);