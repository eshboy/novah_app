import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import cors from 'cors';
import path from 'path';

import { getDb } from './db/database';
import { setupTelegram } from './services/telegram';
import { setupCrons } from './services/crons';
import { rewardsRouter } from './routes/rewards';
import { missionsRouter } from './routes/missions';
import { balanceRouter } from './routes/balance';
import { routinesRouter } from './routes/routines';
import { sessionsRouter } from './routes/sessions';
import { modeRouter } from './routes/mode';
import { adminRouter } from './routes/admin';
import { ServerToClientEvents, ClientToServerEvents } from './types';

const app        = express();
const httpServer = createServer(app);
const io         = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
});

app.use(cors());
app.use(express.json());
app.use(session({
  secret:            process.env.SESSION_SECRET || 'novah-kiosk-secret',
  resave:            false,
  saveUninitialized: false,
  cookie:            { maxAge: 12 * 60 * 60 * 1000 },
}));

// Serve built client
const CLIENT_DIST = path.join(__dirname, '../../client/dist');
app.use(express.static(CLIENT_DIST));

// API
app.use('/api/rewards',  rewardsRouter);
app.use('/api/missions', missionsRouter(io));
app.use('/api/balance',  balanceRouter);
app.use('/api/routines', routinesRouter(io));
app.use('/api/sessions', sessionsRouter(io));
app.use('/api/mode',     modeRouter);
app.use('/api/admin',    adminRouter(io));

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

// Socket.io
io.on('connection', (socket) => {
  socket.on('subscribe', () => socket.join('display'));
});

export { io };

const PORT = process.env.PORT ?? 3000;

// Boot
getDb();
setupTelegram(io);
setupCrons(io);

httpServer.listen(PORT, () => {
  console.log(`🚀 Novah App running on http://localhost:${PORT}`);
});
