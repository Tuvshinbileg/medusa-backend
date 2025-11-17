import { defineLink } from "@medusajs/framework/utils"
import ProductExtension from "../modules/product-extension"
import ProductModule from "@medusajs/medusa/product"

export default defineLink(
    ProductModule.linkable.product,
    ProductExtension.linkable.productExtension
)