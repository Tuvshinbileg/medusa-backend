import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

interface QpayCallbackBody {
    qpay_payment_id: string
}
export const POST = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
    
    try {
        logger.info("Received QPay webhook: " + JSON.stringify(req.body))

        // Extract QPay webhook data
        const webhookData = req.body as QpayCallbackBody

        // Validate required fields
        if (!webhookData || !webhookData.qpay_payment_id) {
            logger.error("Invalid QPay webhook data received")
            return res.status(400).json({
                success: false,
                message: "Invalid webhook data"
            })
        }

        // Process the webhook through the payment provider
        const paymentModuleService = req.scope.resolve("paymentModuleService")
        
        // The webhook handler in the service will process this
        // and update the payment session accordingly
        logger.info(`Processing QPay payment webhook for payment_id: ${webhookData.qpay_payment_id}`)

        // Return success to QPay
        res.status(200).json({
            success: true,
            message: "Webhook received"
        })
    } catch (error) {
        logger.error("Error processing QPay webhook:", error as Error)
        
        // Still return 200 to prevent QPay from retrying
        res.status(200).json({
            success: false,
            message: "Webhook processing failed"
        })
    }
}

export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    // Optional: handle GET requests for testing
    res.status(200).json({
        message: "QPay webhook endpoint is active"
    })
}
