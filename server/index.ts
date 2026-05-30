import 'dotenv/config';
import app from './app';

const PORT = Number(process.env.NOTIFY_SERVER_PORT ?? 3001);
const emailOverride = process.env.NOTIFICATIONS_EMAIL_OVERRIDE ?? 'jeymson9000@gmail.com';

app.listen(PORT, () => {
  console.log(`[notify-server] listening on http://localhost:${PORT}`);
  console.log(`[notify-server] emails → ${emailOverride}`);
});
