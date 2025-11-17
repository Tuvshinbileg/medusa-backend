import { Module } from "@medusajs/framework/utils"
import QpayPaymentProviderService from "./service"

import {
    ModuleProvider,
    Modules

} from "@medusajs/framework/utils"


export default ModuleProvider(Modules.PAYMENT, {
    services: [QpayPaymentProviderService],
})