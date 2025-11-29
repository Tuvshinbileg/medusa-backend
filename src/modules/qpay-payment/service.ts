import {
    CapturePaymentInput, CapturePaymentOutput,
    AuthorizePaymentOutput, CancelPaymentInput,
    CancelPaymentOutput,
    InitiatePaymentOutput, DeletePaymentInput,
    DeletePaymentOutput, GetPaymentStatusInput,
    GetPaymentStatusOutput, RefundPaymentInput,
    RefundPaymentOutput, RetrievePaymentInput,
    RetrievePaymentOutput, UpdatePaymentInput,
    UpdatePaymentOutput, ProviderWebhookPayload,
    WebhookActionResult, AuthorizePaymentInput,
} from "@medusajs/types"
import { PaymentSessionStatus } from "@medusajs/utils";
import { AbstractPaymentProvider, MedusaError } from "@medusajs/framework/utils"
import { Logger } from "@medusajs/framework/types"
import { Address } from "cluster"

import { AxiosResponse } from "axios"
import axios from "axios"

type Options = {
    qpay_username: string
    qpay_password: string
    qpay_invoice_code: string
    qpay_base_url?: string
    qpay_callback_url: string
}

type InjectedDependencies = {
    logger: Logger
}

interface QPayAuthResponse {
    access_token: string
    token_type: string
    expires_in: number
    refresh_token?: string
}

interface QPayInvoiceRequest {
    invoice_code: string
    sender_invoice_no: string
    invoice_receiver_code: string
    invoice_description: string
    amount: number
    callback_url: string
    sender_branch_code: string
}

interface QPayInvoiceResponse {
    invoice_id: string
    qpay_payment_id: string
    qr_text: string
    qr_image: string
    urls: QPayUrls[]
    invoice_code: string
    sender_invoice_no: string
}

interface QPayUrls {
    name: string
    description: string
    logo: string
    link: string
}

interface QPayPaymentCheckRequest {
    object_type: 'INVOICE' | 'PAYMENT'
    object_id: string
    offset: {
        page_number: number
        page_limit: number
    }
}

interface QPayPaymentCheckResponse {
    count: number
    rows: QPayPaymentRow[]
}

interface QPayPaymentRow {
    payment_id: string
    payment_status: 'PAID' | 'REFUNDED' | 'PARTIAL_REFUNDED' | 'PENDING'
    payment_amount: number
    payment_wallet: string
    payment_currency: string
    payment_type: string
    created_date: string
    transaction_id: string
}

interface QPayRefundRequest {
    invoice_id: string
    amount: number
    reason: string
}

interface QPayRefundResponse {
    error_code: string
    error_desc?: string
    refund_id?: string
}

interface QPayWebhookData {
    qpay_payment_id: string
    payment_status: string
    invoice_id: string
    payment_amount?: number
    payment_wallet?: string
    transaction_id?: string
}

interface QPayOptions {
    username: string
    password: string
    invoice_code: string
    base_url?: string
    callback_url: string
}

interface QPaySessionData extends Record<string, unknown> {
    id: string
    qpay_invoice_id: string
    qpay_payment_id: string
    qr_text: string
    qr_image: string
    urls: QPayUrls[]
    invoice_code: string
    sender_invoice_no: string
    amount: number
    currency_code: string
    status: PaymentSessionStatus
    captured_at?: string
    canceled_at?: string
    refunded_at?: string
    updated_at?: string
}

interface PaymentContext {
    amount: number
    currency_code: string
    resource_id: string
    customer: Record<string, any> | null  
    billing_address?: Address
    email?: string
    customer_metadata?: Record<string, any>
    description?: string
}

class QpayPaymentProviderService extends AbstractPaymentProvider<Options> {
    protected logger_: Logger
    protected options_: Options
    protected qpayClient;
    protected accessToken: string | null = null
    static identifier = "qpay-payment"

    constructor(
        container: InjectedDependencies,
        options: Options

    ) {
        super(container, options)
        this.logger_ = container.logger
        this.options_ = options
        this.qpayClient = axios.create({
            baseURL: this.options_.qpay_base_url,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            }
        })

        this.logger_.info("QPay Payment Provider Service initialized: config: " + JSON.stringify(this.options_));
        this.init()

    }

    async init(): Promise<void> {
        try {
            this.logger_.info("Initializing QPay Payment Provider Service");
            await this.getAccessToken()
        } catch (error) {
            console.error("Failed to initialize QPay provider:", (error as Error).message)
        }
    }

    async getAccessToken(): Promise<string> {
        try {
            const token = Buffer.from(
                `${this.options_.qpay_username}:${this.options_.qpay_password}`

            ).toString("base64");
            this.logger_.info("Requesting QPay access token");

            const response: AxiosResponse<QPayAuthResponse> = await this.qpayClient.post(
                "/v2/auth/token",
                {}, // body (empty object if none)
                {
                    headers: {
                        Authorization: `Basic ${token}`,
                    },
                }
            );

            this.logger_.info("QPay access token received successfully");

            if (response.data && response.data.access_token) {
                this.accessToken = response.data.access_token
                this.logger_.info("QPay Access Token obtained and cached");
                this.qpayClient.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`
                return this.accessToken
            } else {
                throw new Error('Invalid response from QPay auth')
            }
        } catch (error) {
            this.logger_.error("Error obtaining QPay access token:", error as Error);
            throw new MedusaError(
                MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
                `Failed to get QPay access token: ${(error as Error).message}`,
            )
        }
    }

    private async checkQPayPaymentStatus(invoiceId: string): Promise<QPayPaymentCheckResponse> {
        try {
            if (!this.accessToken) {
                await this.getAccessToken()
            }

            const checkRequest: QPayPaymentCheckRequest = {
                object_type: 'INVOICE',
                object_id: invoiceId,
                offset: {
                    page_number: 1,
                    page_limit: 100
                }
            }

            this.logger_.info(`Checking QPay payment status for invoice ID: ${invoiceId}`);
            
            if (process.env.NODE_ENV === 'development' || process.env.QPAY_MOCK === 'true') {
                this.logger_.info("Using mock QPay payment response (DEV MODE)");
                return {
                    "count": 1,
                    "rows": [
                        {
                            "payment_id": "593744473409193",
                            "payment_status": "PAID",
                            "payment_amount": 100.00,
                            "payment_wallet": "0fc9b71c-cd87-4ffd-9cac-2279ebd9deb0",
                            "payment_currency": "MNT",
                            "payment_type": "P2P",
                            "created_date": new Date().toISOString(),
                            "transaction_id": "TXN-" + Date.now()
                        }
                    ]
                }
            }
            const response: AxiosResponse<QPayPaymentCheckResponse> = await this.qpayClient.post(
                '/v2/payment/check',
                checkRequest
            )       

            return response.data
        } catch (error) {
            this.logger_.error("Error checking QPay payment status:", error as Error);
            throw new MedusaError(
                MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
                `Failed to check QPay payment status: ${(error as Error).message}`,
            )
        }
    }

    async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
        const { data } = input
        const sessionData = data as unknown as QPaySessionData
        this.logger_.info(`Capturing QPay payment for session: ${sessionData.id}`);

        try {
            const paymentCheck = await this.checkQPayPaymentStatus(sessionData.qpay_invoice_id)

            if (paymentCheck.count > 0 && paymentCheck.rows.length > 0) {
                const payment = paymentCheck.rows[0]

                if (payment.payment_status === 'PAID') {
                    return {
                        data: {
                            ...sessionData,
                            status: PaymentSessionStatus.AUTHORIZED,
                            captured_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        }
                    }
                } else {
                    throw new Error(`Payment not completed. Current status: ${payment.payment_status}`)
                }
            } else {
                throw new Error('Payment not found in QPay system')
            }
        } catch (error) {
            this.logger_.error("Error capturing QPay payment:", error as Error);
            throw new MedusaError(
                MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
                `Failed to capture QPay payment: ${(error as Error).message}`,
            )
        }
    }

    async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
        const { data } = input
        const sessionData = data as unknown as QPaySessionData

        this.logger_.info(`Authorizing QPay payment for session: ${sessionData.id}`);

        try {
            const paymentCheck = await this.checkQPayPaymentStatus(sessionData.qpay_invoice_id)

            if (paymentCheck.count > 0 && paymentCheck.rows.length > 0) {
                const payment = paymentCheck.rows[0]

                let status: PaymentSessionStatus
                switch (payment.payment_status) {
                    case 'PAID':
                        status = PaymentSessionStatus.AUTHORIZED
                        break
                    case 'PENDING':
                        status = PaymentSessionStatus.PENDING
                        break
                    case 'REFUNDED':
                    case 'PARTIAL_REFUNDED':
                        status = PaymentSessionStatus.AUTHORIZED // Still authorized, but refunded
                        break
                    default:
                        status = PaymentSessionStatus.ERROR
                }

                return {
                    status,
                    data: {
                        ...sessionData,
                        status,
                        updated_at: new Date().toISOString(),
                    }
                }
            } else {
                return {
                    status: PaymentSessionStatus.PENDING,
                    data: {
                        ...sessionData,
                        status: PaymentSessionStatus.PENDING,
                        updated_at: new Date().toISOString(),
                    }
                }
            }
        } catch (error) {
            this.logger_.error("Error authorizing QPay payment:", error as Error);
            throw new MedusaError(
                MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
                `Failed to authorize QPay payment: ${(error as Error).message}`,
            )
        }
    }

    async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
        const { data } = input
        const sessionData = data as unknown as QPaySessionData

        try {
            return {
                data: {
                    ...sessionData,
                    status: PaymentSessionStatus.CANCELED,
                    canceled_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }
            }
        } catch (error) {
            this.logger_.error("Error canceling QPay payment:", error as Error);
            throw new MedusaError(
                MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
                `Failed to cancel QPay payment: ${(error as Error).message}`,
            )
        }
    }

    async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
        const { data } = input
        const sessionData = data as unknown as QPaySessionData

        try {
            // Similar to cancel, we just mark it as deleted
            // QPay invoices expire automatically if not paid
            this.logger_.info(`Deleting QPay payment session: ${sessionData.id}`);

            return {
                data: {
                    ...sessionData,
                    status: PaymentSessionStatus.CANCELED,
                    canceled_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }
            }
        } catch (error) {
            this.logger_.error("Error deleting QPay payment:", error as Error);
            throw new MedusaError(
                MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
                `Failed to delete QPay payment: ${(error as Error).message}`,
            )
        }
    }

    async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
        const { data } = input
        const sessionData = data as unknown as QPaySessionData

        try {
            const paymentCheck = await this.checkQPayPaymentStatus(sessionData.qpay_invoice_id)

            if (paymentCheck.count > 0 && paymentCheck.rows.length > 0) {
                const payment = paymentCheck.rows[0]

                let status: PaymentSessionStatus
                switch (payment.payment_status) {
                    case 'PAID':
                        status = PaymentSessionStatus.AUTHORIZED
                        break
                    case 'PENDING':
                        status = PaymentSessionStatus.PENDING
                        break
                    case 'REFUNDED':
                    case 'PARTIAL_REFUNDED':
                        status = PaymentSessionStatus.AUTHORIZED // Still authorized, but refunded
                        break
                    default:
                        status = PaymentSessionStatus.ERROR
                }

                return {
                    status,
                    data: {
                        ...sessionData,
                        status,
                        updated_at: new Date().toISOString(),
                    }
                }
            } else {
                return {
                    status: PaymentSessionStatus.PENDING,
                    data: {
                        ...sessionData,
                        status: PaymentSessionStatus.PENDING,
                        updated_at: new Date().toISOString(),
                    }
                }
            }
        } catch (error) {
            this.logger_.error("Error getting QPay payment status:", error as Error);
            throw new MedusaError(
                MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
                `Failed to get QPay payment status: ${(error as Error).message}`,
            )
        }
    }

    async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
        const { data, amount } = input
        const sessionData = data as unknown as QPaySessionData

        try {
            if (!this.accessToken) {
                await this.getAccessToken()
            }

            const refundRequest: QPayRefundRequest = {
                invoice_id: sessionData.qpay_invoice_id,
                amount: Math.round(Number(amount || 0) / 100), // Convert cents to actual amount
                reason: 'Customer requested refund'
            }

            const response: AxiosResponse<QPayRefundResponse> = await this.qpayClient.post(
                '/v2/payment/refund',
                refundRequest
            )

            if (response.data && response.data.error_code === '000') {
                return {
                    data: {
                        ...sessionData,
                        status: PaymentSessionStatus.AUTHORIZED,
                        refunded_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    }
                }
            } else {
                throw new Error(`QPay refund failed: ${response.data.error_desc || 'Unknown error'}`)
            }
        } catch (error) {
            this.logger_.error("Error refunding QPay payment:", error as Error);
            throw new MedusaError(
                MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
                `Failed to refund QPay payment: ${(error as Error).message}`,
            )
        }
    }

    async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
        const { data } = input
        const sessionData = data as unknown as QPaySessionData

        try {
            // Retrieve fresh payment status from QPay
            const paymentCheck = await this.checkQPayPaymentStatus(sessionData.qpay_invoice_id)

            if (paymentCheck.count > 0 && paymentCheck.rows.length > 0) {
                const payment = paymentCheck.rows[0]

                let status: PaymentSessionStatus
                switch (payment.payment_status) {
                    case 'PAID':
                        status = PaymentSessionStatus.AUTHORIZED
                        break
                    case 'PENDING':
                        status = PaymentSessionStatus.PENDING
                        break
                    case 'REFUNDED':
                    case 'PARTIAL_REFUNDED':
                        status = PaymentSessionStatus.AUTHORIZED
                        break
                    default:
                        status = PaymentSessionStatus.ERROR
                }

                return {
                    data: {
                        ...sessionData,
                        status,
                        updated_at: new Date().toISOString(),
                    }
                }
            }

            return {
                data: sessionData
            }
        } catch (error) {
            this.logger_.error("Error retrieving QPay payment:", error as Error);
            // Return existing data if retrieval fails
            return {
                data: sessionData
            }
        }
    }

    async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
        const { data, context } = input
        const sessionData = data as unknown as QPaySessionData

        try {
            // QPay invoices cannot be updated once created
            // We can only update the local session data
            const updatedData: QPaySessionData = {
                ...sessionData,
                amount: (context as any)?.amount ? Math.round(Number((context as any).amount) / 100) : sessionData.amount,
                currency_code: (context as any)?.currency_code || sessionData.currency_code,
                updated_at: new Date().toISOString(),
            }

            return {
                data: updatedData
            }
        } catch (error) {
            this.logger_.error("Error updating QPay payment:", error as Error);
            throw new MedusaError(
                MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
                `Failed to update QPay payment: ${(error as Error).message}`,
            )
        }
    }

    async getWebhookActionAndData(data: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
        try {
            const webhookData = data.data as unknown as QPayWebhookData

            this.logger_.info("Processing QPay webhook: " + JSON.stringify(webhookData));

            // Validate webhook data
            if (!webhookData || !webhookData.qpay_payment_id || !webhookData.invoice_id) {
                throw new Error('Invalid webhook data received from QPay')
            }

            // Verify payment status from QPay API
            const paymentCheck = await this.checkQPayPaymentStatus(webhookData.invoice_id)

            if (paymentCheck.count > 0 && paymentCheck.rows.length > 0) {
                const payment = paymentCheck.rows[0]

                // Determine the action based on payment status
                if (payment.payment_status === 'PAID') {
                    return {
                        action: 'authorized' as const,
                        data: {
                            session_id: webhookData.invoice_id,
                            amount: payment.payment_amount * 100, // Convert to cents
                        } as any
                    }
                } else if (payment.payment_status === 'REFUNDED' || payment.payment_status === 'PARTIAL_REFUNDED') {
                    return {
                        action: 'authorized' as const, // or you can create a custom action
                        data: {
                            session_id: webhookData.invoice_id,
                            amount: payment.payment_amount * 100,
                        } as any
                    }
                } else {
                    return {
                        action: 'not_supported' as const,
                        data: {
                            session_id: webhookData.invoice_id,
                            amount: 0,
                        } as any
                    }
                }
            } else {
                this.logger_.warn("Payment not found in QPay system for webhook");
                return {
                    action: 'not_supported' as const,
                    data: {
                        session_id: webhookData.invoice_id,
                        amount: 0,
                    } as any
                }
            }
        } catch (error) {
            this.logger_.error("Error processing QPay webhook:", error as Error);
            return {
                action: 'not_supported' as const,
                data: {
                    session_id: '',
                    amount: 0,
                } as any
            }
        }
    }

    async initiatePayment(context: PaymentContext): Promise<InitiatePaymentOutput> {
        const {
            amount,
            currency_code,
            resource_id,
            customer,
            email,
            description
        } = context

        try {
            if (!this.accessToken) {
                await this.getAccessToken()
            }

            const invoiceData: QPayInvoiceRequest = {
                invoice_code: this.options_.qpay_invoice_code,
                sender_invoice_no: `MEDUSA-${resource_id}-${Date.now()}`,
                invoice_receiver_code: customer?.phone || email || 'CUSTOMER',
                invoice_description: description || `Payment for Order ${resource_id}`,
                amount: Math.round(amount),
                sender_branch_code: "SALBAR1",
                callback_url: `${this.options_.qpay_callback_url}?payment_id=${resource_id}`,
            }

            this.logger_.info("Creating QPay invoice with data:  " + JSON.stringify(invoiceData));
            const response: AxiosResponse<QPayInvoiceResponse> = await this.qpayClient.post(
                '/v2/invoice',
                invoiceData
            )

            this.logger_.info("QPay invoice created with data: " + JSON.stringify(response.data));
            if (response.data && (response.data.invoice_id || response.data.qr_text)) {
                const sessionData: QPaySessionData = {
                    id: response.data.invoice_id,
                    qpay_invoice_id: response.data.invoice_id,
                    qpay_payment_id: response.data.qpay_payment_id,
                    qr_text: response.data.qr_text,
                    qr_image: response.data.qr_image,
                    urls: response.data.urls || [],
                    invoice_code: invoiceData.invoice_code,
                    sender_invoice_no: invoiceData.sender_invoice_no,
                    amount: invoiceData.amount,
                    currency_code,
                    status: PaymentSessionStatus.PENDING,
                    updated_at: new Date().toISOString(),
                }

                return {
                    id: resource_id,
                    data: sessionData
                }
            } else {
                throw new Error('Invalid response from QPay invoice creation')
            }
        } catch (error) {
            this.logger_.error("Error initiating QPay payment:", error.message);
            throw new MedusaError(
                MedusaError.Types.PAYMENT_REQUIRES_MORE_ERROR,
                `Failed to initiate QPay payment: ${error.message}`,
                (error as any).response?.status || 500
            )
        }
    }
}

export default QpayPaymentProviderService