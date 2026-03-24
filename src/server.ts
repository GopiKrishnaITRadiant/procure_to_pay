import app from "./app"
import "./config/env"

import connectDB from "./config/dbConfig"
import { startSubscriptionCron } from "./jobs/subscriptionCron"
import { startSAPCron } from "./jobs/sapCron"

const port = process.env.PORT || 5000

const startServer = async () => {
  try {
    await connectDB()
    startSubscriptionCron()
    startSAPCron()
    app.listen(port, () => {
      console.log("Server starting. PID:", process.pid);
      console.log("PORT:", port);
      console.log(`Server is running on http://localhost:${port}`)
    })
    } catch (error) {
    console.error("Failed to start server:", error)
    process.exit(1)
  }
}

startServer()
