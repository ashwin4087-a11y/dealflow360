import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    service: 'dealflow360-backend',
    status: 'healthy'
  });
});

app.get('/api', (_req, res) => {
  res.json({
    name: 'DealFlow360 API',
    version: '1.0.0'
  });
});

app.listen(PORT, () => {
  console.log(`DealFlow360 backend running on http://localhost:${PORT}`);
});
