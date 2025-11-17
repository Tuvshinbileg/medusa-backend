import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import ProductExtensionService from '../../../modules/product-extension/service';
import { PRODUCT_EXTENSION_MODULE } from "../../../modules/product-extension";

type CreateCustomStepInput = {
  custom_name?: string
}

export const createCustomStep = createStep(
  "create-custom",
  async (data: CreateCustomStepInput, { container }) => {
    if (!data.custom_name) {
      return
    }

    const helloModuleService: HelloModuleService = container.resolve(
      HELLO_MODULE
    )

    const custom = await helloModuleService.createCustoms(data)

    return new StepResponse(custom, custom)
  },
  async (custom, { container }) => {
    const helloModuleService: HelloModuleService = container.resolve(
      HELLO_MODULE
    )

    await helloModuleService.deleteCustoms(custom.id)
  }
)