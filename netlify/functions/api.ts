import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';
import { router as apiRouter } from '../../server/routes';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api', (req, res) => res.json({ ok: true }));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api', apiRouter);
app.use('/', apiRouter);

export const handler = serverless(app);
