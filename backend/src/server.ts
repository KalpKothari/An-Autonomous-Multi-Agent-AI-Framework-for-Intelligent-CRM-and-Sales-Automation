import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDatabase from "./config/database";
import customerRoutes from "./routes/customerRoutes";
import leadRoutes from "./routes/leadRoutes";
import productRoutes from "./routes/productRoutes";
import inventoryRoutes from "./routes/inventoryRoutes";
import conversationRoutes from "./routes/conversationRoutes";
import followUpRoutes from "./routes/followUpRoutes";
import aiRoutes from "./routes/aiRoutes";
import vapiRoutes from "./routes/vapiRoutes";
import orderRoutes from "./routes/orderRoutes";
import invoiceRoutes from "./routes/invoiceRoutes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/customers", customerRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/followups", followUpRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/vapi", vapiRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/invoices", invoiceRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "RELAY backend is running",
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`RELAY backend running on port ${PORT}`);
  });
};

startServer();