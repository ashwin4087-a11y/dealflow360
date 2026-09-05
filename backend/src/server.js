import "dotenv/config";
import { createApp } from "./app.js";
import { prisma } from "./utils/prisma.js";

const PORT = process.env.PORT || 5000;
const app = createApp(prisma);

app.listen(PORT, () => {
  console.log(`DealFlow360 backend running on http://localhost:${PORT}`);
});
