const app = require("./src/app");
const initializeTables = require("./src/initdb");

const PORT = 3000;

// Initialize DB tables on server start
initializeTables();

app.listen(PORT, () => {
  console.log(`HeartHabitz Backend running on port ${PORT}`);
});

