import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading } from "@medusajs/ui"

const NestedOrdersPage = () => {
    return (
        <Container className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
                <Heading level="h1">Nested Orders Page</Heading>
            </div>
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "Nested Orders",
    nested: "/orders",
})

export default NestedOrdersPage

export const handle = {
    breadcrumb: () => "Nested Custom Route",
}