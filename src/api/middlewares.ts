import {
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { PostAdminCreateBrand } from "./admin/brands/validators"
import { z } from "zod"


export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/brands",
      method: "POST",
      middlewares: [
        validateAndTransformBody(PostAdminCreateBrand),
      ],
    },
    {
      matcher: "/admin/proucts",
      method: "POST",
      additionalDataValidator: {
        custom_name: z.string().optional(),
      },
    },
  ],
})