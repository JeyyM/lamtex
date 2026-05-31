import 'dotenv/config';
import app from './app';

const PORT = Number(process.env.PORT ?? process.env.NOTIFY_SERVER_PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';
const emailOverride = process.env.NOTIFICATIONS_EMAIL_OVERRIDE ?? 'jeymson9000@gmail.com';

app.listen(PORT, HOST, () => {
  console.log(`[notify-server] listening on http://${HOST}:${PORT}`);
  console.log(`[notify-server] emails → ${emailOverride}`);
});
