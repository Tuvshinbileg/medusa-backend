import { loadEnv, defineConfig } from '@medusajs/framework/utils';
import { resolve } from 'path';

loadEnv(process.env.NODE_ENV || 'development', process.cwd());

module.exports = defineConfig({
  modules: [
    {
      resolve: "./src/modules/brand"
    },
    {
      resolve: "./src/modules/product-extension"
    },
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
      },
    }
  ],
  projectConfig: {
    // workerMode: process.env.WORKER_MODE || "shared",
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: {
      ssl: false,
      sslmode: 'disable',
    },
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || 'supersecret',
      cookieSecret: process.env.COOKIE_SECRET || 'supersecret',
    },
  },
});
