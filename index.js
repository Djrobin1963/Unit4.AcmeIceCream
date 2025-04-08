// Import Express App
const express = require("express");
const app = express();

// Import PG Client
const { Client } = require("pg");
const client = new Client(process.env.DATABASE_URL || 3001);

// Import Morgan
const morgan = require("morgan");

// PORT VARIABLE
const PORT = process.env.PORT || 3001;

// Import the Seed Data
const iceCreamFlavors = require("./db/index");

// Middleware
app.use(express.json());
app.use(morgan("dev"));

// Connect to the Database
client.connect().catch((err) => {
  console.error("Failed to connect to database:", err);
  process.exit(1);
});
console.log("connected to database");

// Create the table
const createTable = async () => {
  try {
    await client.query(
      /*sql*/
      `DROP TABLE IF EXISTS flavors;
       CREATE TABLE flavors( 
        id SERIAL PRIMARY KEY,
        flavor_name VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        is_favorite BOOLEAN NOT NULL DEFAULT false)
      `
    );
    console.log("Table 'flavors' created");
  } catch (err) {
    console.error("Error creating table:", err);
  }
};

// Data Seed Function
const seedData = async () => {
  try {
    console.log("Checking if database needs seeding...");

    // Check if there are any flavors in the table
    const result = await client.query("SELECT COUNT(*) FROM flavors");
    const count = parseInt(result.rows[0].count, 10);

    if (count === 0) {
      console.log("Seeding database...");
      for (const flavor of iceCreamFlavors) {
        await client.query(
          /*sql*/
          `INSERT INTO flavors
          (flavor_name, is_favorite, created_at, updated_at)
          VALUES ($1, $2, $3, $4)`,
          [flavor.flavor_name, flavor.is_favorite, new Date(), new Date()]
        );
      }
      console.log("Seeding complete");
    } else {
      console.log("Database already seeded, skipping...");
    }
  } catch (err) {
    console.error("Error seeding data:", err);
  }
};

// Init, Create, Seed
const init = async () => {
  await createTable();
  await seedData();
  console.log("Database initialized");
};

init();

// Create Routes: GET, POST, PUT, DELETE

// POST
app.post("/api/flavors", async (req, res, next) => {
  try {
    const SQL = /*sql*/ `INSERT INTO flavors (flavor_name, is_favorite, created_at, updated_at) 
    VALUES ($1, $2, NOW(), NOW()) RETURNING *;`;
    const response = await client.query(SQL, [
      req.body.flavor_name,
      req.body.is_favorite,
    ]);
    res.send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET ALL
app.get("/api/flavors", async (req, res, next) => {
  try {
    const SQL = /*sql*/ `SELECT * FROM flavors ORDER BY created_at DESC;`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

// GET SELECTED
app.get("/api/flavors/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const SQL = /*sql*/ `SELECT * FROM flavors WHERE id = $1;`;
    const response = await client.query(SQL, [id]);
    if (response.rows.length === 0) {
      return res.status(404).json({ error: "Flavor not found" });
    }
    res.json(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT - UPDATE
app.put("/api/flavors/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { flavor_name, is_favorite } = req.body;
    const SQL = /*sql*/ `
      UPDATE flavors
      SET flavor_name = $1, is_favorite = $2, updated_at = now()
      WHERE id = $3
      RETURNING *;`;
    const response = await client.query(SQL, [flavor_name, is_favorite, id]);
    if (response.rows.length === 0) {
      return res.status(404).json({ error: "Flavor not found" });
    }
    res.json(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE
app.delete("/api/flavors/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const SQL = /*sql*/ `
    DELETE from flavors
    WHERE id = $1`;
    const response = await client.query(SQL, [id]);
    if (response.rowCount === 0) {
      return res.status(404).json({ error: "Flavor not found" });
    }
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.listen(PORT, () => console.log(`listening on port ${PORT}`));
