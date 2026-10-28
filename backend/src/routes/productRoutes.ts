
import { Router } from "express";
import {
  createProduct,
  getProducts,
} from "../controllers/productController";
import { importLaptopCsv } from "../controllers/laptopImportController";

const router = Router();

router.post("/import-laptops", importLaptopCsv);

router.post("/", createProduct);
router.get("/", getProducts);

export default router;
