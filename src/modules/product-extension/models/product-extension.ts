import { model } from "@medusajs/framework/utils"

export const ProductExtension = model.define("product_extension", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  custom_name: model.text(), // Add your custom column(s) here
})