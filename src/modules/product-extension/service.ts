import { MedusaService } from "@medusajs/framework/utils"
import { ProductExtension } from "./models/product-extension"

class ProductExtensionService extends MedusaService({
    ProductExtension,
}) {

}

export default ProductExtensionService