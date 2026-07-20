import 'dotenv/config';
import { createApp } from './app';
import { waitForDb } from './db';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

waitForDb()
  .then(() => {
    const app = createApp();
    app.listen(PORT, () => console.log(`[server] SpotBook API запущен на порту ${PORT}`));
  })
  .catch((err) => {
    console.error('Не удалось запустить сервер:', err);
    process.exit(1);
  });
