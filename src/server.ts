import 'dotenv/config';
import app from './app';
import './queue/worker'; // Start the worker


const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
  console.log(`[server]: Server is running at ${PORT}`);
});
