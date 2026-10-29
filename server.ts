/**
 * Servidor Principal do FinanPro - CORRIGIDO PARA RENDER
 */
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { router as apiRouter } from './server/routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  const { db } = await import('./server/db.js');
  const { seedDemoDataForUser } = await import('./server/seed.js');
  const bcrypt = (await import('bcryptjs')).default;
  const dbData = db.getData();
  if (dbData.users.length === 0) {
    const adminUser = {
      id: 'usr_admin_default',
      name: 'Administrador FinanPro',
      email: 'admin@finanpro.com.br',
      passwordHash: await bcrypt.hash('admin123', 10),
      isEmailVerified: true,
      role: 'admin' as const,
      createdAt: new Date().toISOString(),
    };
    dbData.users.push(adminUser);
    seedDemoDataForUser(adminUser.id);
    db.save();
    console.log('[FinanPro] Usuário demo: admin@finanpro.com.br / admin123');
  }

  app.use('/api', apiRouter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // CORREÇÃO: usa process.cwd() que é sempre a raiz no Render
    const distPath = path.resolve(process.cwd(), 'dist');
    console.log('[FinanPro] Procurando dist em:', distPath, 'Existe?', fs.existsSync(distPath));
    
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) return res.status(404).json({ erro: 'Não encontrado' });
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.error('[FinanPro] ERRO: pasta dist não encontrada! Verifique o build');
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FinanPro] Servidor rodando na porta ${PORT} (${isProd ? 'produção' : 'dev'})`);
  });
}

startServer().catch((err) => {
  console.error('[FinanPro] Erro fatal:', err);
  process.exit(1);
});
