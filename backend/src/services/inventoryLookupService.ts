import Product from "../models/Product";
import Inventory from "../models/Inventory";

export const findProductWithInventory = async (
  productName: string
) => {
  const product = await Product.findOne({
    name: { $regex: productName, $options: "i" },
  });

  if (!product) {
    return null;
  }

  const inventory = await Inventory.findOne({
    product: product._id,
  }).populate("product");

  return {
    product,
    inventory,
  };
};