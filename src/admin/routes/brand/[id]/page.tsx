// import { Container, Heading } from "@medusajs/ui"
// import { LoaderFunctionArgs, UIMatch, useLoaderData } from "react-router-dom"
// import { sdk } from "../../../../sd"

// type BrandResponse = {
//     brand: {
//         name: string
//     }
// }

// const BrandPage = () => {
//     const { brand } = useLoaderData() as Awaited<BrandResponse>

//     return (
//         <Container className="divide-y p-0">
//             <div className="flex items-center justify-between px-6 py-4">
//                 <Heading level="h2">{brand.name}</Heading>
//             </div>
//         </Container>
//     )
// }

// export default BrandPage

// export async function loader({ params }: LoaderFunctionArgs) {
//     const { id } = params
//     const { brand } = await sdk.client.fetch<BrandResponse>(`/admin/brands/${id}`)

//     return {
//         brand,
//     }
// }

// export const handle = {
//     breadcrumb: (
//         { data }: UIMatch<BrandResponse>
//     ) => data.brand.name || "Brand",
// }