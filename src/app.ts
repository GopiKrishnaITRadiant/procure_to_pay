import express from "express"
import { errorMiddleware } from "./middlewares/errorMiddleware"
import apiRoutes from "./routes/index"

const app = express()

app.use(express.json())

app.use(apiRoutes)

app.use(errorMiddleware)

export default app