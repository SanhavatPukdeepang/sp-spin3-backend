import { EventEmitter } from 'events';

const sseEvents = new EventEmitter();
let clients = [];

export const sseHandler = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res,
  };

  clients.push(newClient);
  console.log(`SSE Client connected: ${clientId}. Total clients: ${clients.length}`);

  // Send initial heartbeat or "connected" message
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  const heartbeat = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients = clients.filter(client => client.id !== clientId);
    console.log(`SSE Client disconnected: ${clientId}. Total clients: ${clients.length}`);
  });
};

export const broadcastSSE = (data) => {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => client.res.write(payload));
};
