# QPay Payment Integration for Medusa.js

A complete payment provider integration for QPay (Mongolian payment gateway) with Medusa.js e-commerce platform.

## 🚀 Features

- ✅ Payment session creation with QR code generation
- ✅ Real-time payment status checking
- ✅ Payment authorization and capture
- ✅ Refund processing
- ✅ Webhook support for payment notifications
- ✅ Full TypeScript support
- ✅ Comprehensive error handling and logging

## 📋 Prerequisites

- Medusa.js v2.x backend
- QPay merchant account with API credentials
- Node.js >= 20
- PostgreSQL database

## 🔧 Installation

The integration is already set up as a custom payment provider in your Medusa backend.

### Required Dependencies

```json
{
  "axios": "^1.12.2",
  "@medusajs/framework": "2.10.1"
}
```

## ⚙️ Configuration

### 1. Environment Variables

Add the following environment variables to your `.env` file:

```bash
# QPay Credentials
QPAY_USERNAME=your_qpay_username
QPAY_PASSWORD=your_qpay_password
QPAY_INVOICE_CODE=your_invoice_code
QPAY_BASE_URL=https://merchant.qpay.mn
QPAY_CALLBACK_URL=https://yourdomain.com/webhooks/qpay
```

### 2. Medusa Configuration

The provider is already configured in `medusa-config.ts`:

```typescript
{
  resolve: "@medusajs/medusa/payment",
  options: {
    providers: [
      {
        resolve: "./src/modules/qpay-payment",
        id: "qpay-payment",
        options: {
          qpay_username: process.env.QPAY_USERNAME,
          qpay_password: process.env.QPAY_PASSWORD,
          qpay_invoice_code: process.env.QPAY_INVOICE_CODE,
          qpay_base_url: process.env.QPAY_BASE_URL || "https://merchant.qpay.mn",
          qpay_callback_url: process.env.QPAY_CALLBACK_URL
        }
      }
    ]
  }
}
```

## 🎯 Usage

### Payment Flow

1. **Initiate Payment**
   - Customer selects QPay as payment method
   - System creates a QPay invoice with QR code
   - Customer scans QR code with their mobile banking app

2. **Payment Processing**
   - Customer completes payment through their banking app
   - QPay sends webhook notification
   - System verifies payment status
   - Order is confirmed

3. **Post-Payment Actions**
   - Capture payment for fulfillment
   - Process refunds if needed
   - Check payment status anytime

### API Endpoints

#### Webhook Endpoint
```
POST /webhooks/qpay
```

This endpoint receives payment notifications from QPay. Make sure to configure this URL in your QPay merchant dashboard.

**Webhook Payload Example:**
```json
{
  "qpay_payment_id": "12345678",
  "payment_status": "PAID",
  "invoice_id": "INV-123",
  "payment_amount": 10000,
  "payment_wallet": "GOLOMT",
  "transaction_id": "TXN-456789"
}
```

### Testing the Webhook

You can test the webhook endpoint:
```bash
GET /webhooks/qpay
```

Response:
```json
{
  "message": "QPay webhook endpoint is active"
}
```

## 🔌 Provider Methods

### `initiatePayment(context)`
Creates a new QPay invoice with QR code for payment.

**Returns:**
```typescript
{
  id: string,
  data: {
    qpay_invoice_id: string,
    qpay_payment_id: string,
    qr_text: string,
    qr_image: string,
    urls: QPayUrls[],
    status: PaymentSessionStatus.PENDING
  }
}
```

### `authorizePayment(input)`
Checks if payment has been completed and authorizes it.

### `capturePayment(input)`
Captures an authorized payment.

### `getPaymentStatus(input)`
Retrieves the current status of a payment from QPay.

### `refundPayment(input)`
Processes a refund for a completed payment.

### `cancelPayment(input)`
Cancels a pending payment session.

### `getWebhookActionAndData(data)`
Processes webhook notifications from QPay.

## 📊 Payment Statuses

| QPay Status | Medusa Status | Description |
|------------|---------------|-------------|
| PAID | AUTHORIZED | Payment completed successfully |
| PENDING | PENDING | Waiting for customer payment |
| REFUNDED | AUTHORIZED* | Payment refunded |
| PARTIAL_REFUNDED | AUTHORIZED* | Partially refunded |

*Note: Refunded payments remain AUTHORIZED in Medusa with refund metadata

## 🛠️ Development

### Running the Backend
```bash
yarn dev
```

### Testing Payment Integration
1. Create a test order through your storefront
2. Select QPay as payment method
3. Use QPay sandbox environment for testing
4. Check logs for payment flow:
```bash
tail -f /var/log/medusa/app.log
```

## 🔐 Security

- Never commit `.env` file with credentials
- Use HTTPS for webhook endpoints
- Validate webhook signatures (implement if QPay provides)
- Store sensitive data in environment variables
- Use proper error handling to avoid exposing internal details

## 🐛 Troubleshooting

### Payment Not Authorized
- Check QPay credentials in `.env`
- Verify invoice code is correct
- Check access token is being obtained successfully
- Review logs: `logger_.info()` and `logger_.error()` messages

### Webhook Not Receiving Events
- Verify callback URL is publicly accessible
- Check QPAY_CALLBACK_URL environment variable
- Ensure webhook endpoint is not behind authentication
- Check QPay merchant dashboard webhook configuration

### Access Token Issues
- Token expires after a certain time
- Service automatically refreshes token
- Check credentials if getting auth errors

## 📝 API Documentation

### QPay API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v2/auth/token` | POST | Obtain access token |
| `/v2/invoice` | POST | Create payment invoice |
| `/v2/payment/check` | POST | Check payment status |
| `/v2/payment/refund` | POST | Process refund |

## 🤝 Support

For QPay API issues:
- Email: support@qpay.mn
- Documentation: https://merchant.qpay.mn/docs

For Medusa integration issues:
- Check Medusa documentation: https://docs.medusajs.com
- Review service logs for error messages

## 📜 License

MIT

## 🔄 Version History

### v1.0.0 (Current)
- Initial implementation
- Full payment lifecycle support
- Webhook integration
- Refund processing
- Comprehensive error handling

---

**Made with ❤️ for Mongolian E-commerce**
