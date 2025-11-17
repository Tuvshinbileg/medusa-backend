import { Module } from "@medusajs/framework/utils"
import ProductExtensionService from "./service"

export const PRODUCT_EXTENSION_MODULE = "product_extension"

export default Module(PRODUCT_EXTENSION_MODULE, {
    service: ProductExtensionService,
})