import { useParams } from "react-router-dom"
import { Container, Heading } from "@medusajs/ui"

const CustomPage = () => {
  const { id } = useParams()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Passed ID: {id}</Heading>
      </div>
    </Container>
  )
}

export default CustomPage