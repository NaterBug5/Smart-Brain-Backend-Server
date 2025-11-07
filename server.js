import express, { response } from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import cors from "cors";
import knex from "knex";

const db = knex({
  client: "pg",
  connection: {
    host: "dpg-d471f6idbo4c739jmgcg-a",
    port: 5432,
    user: "smart_brain_db_ccg3_user",
    password: "nLJ3a8pzLYV5eWTvuq2ei0QpOCaT7SKv",
    database: "smart_brain_db_ccg3",
    ssl: { rejectUnauthorized: false },
  },
});

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Sucess!");
});

app.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json("Incorrect form submission");

  try {
    const data = await db
      .select("email", "hash")
      .from("login")
      .where("email", "=", email);
    if (data.length === 0) return res.status(400).json("Invalid credentials");

    const isValid = bcrypt.compareSync(password, data[0].hash);
    if (!isValid) return res.status(400).json("Invalid credentials");

    const user = await db.select("*").from("users").where("email", "=", email);
    return res.json(user[0]);
  } catch (err) {
    return res.status(400).json("Unable to get user");
  }
});

app.post("/register", async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password)
    return res.status(400).json({ error: "Incorrect form submission" });

  const hash = bcrypt.hashSync(password, 10);

  try {
    const user = await db.transaction(async (trx) => {
      const [login] = await trx("login")
        .insert({ hash, email })
        .returning("email");

      const [newUser] = await trx("users")
        .insert({ email: login.email || login, name, joined: new Date() })
        .returning("*");

      return newUser; // ✅ return user directly
    });

    res.json(user); // ✅ return JSON object
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Unable to register" });
  }
});

app.get("/profile/:id", (req, res) => {
  const { id } = req.params;
  db.select("*")
    .from("users")
    .where({ id })
    .then((user) => {
      user.length ? res.json(user[0]) : res.status(400).json("Not found");
    })
    .catch((err) => res.status(400).json("Error getting user"));
});

app.put("/image", (req, res) => {
  const { id } = req.body;
  db("users")
    .where("id", "=", id)
    .increment("entries", 1)
    .returning("entries")
    .then((entries) => {
      res.json(entries[0].entries);
    })
    .catch((err) => res.status(400).json("Unable to get entries"));
});

app.listen(3000, () => {
  console.log("App is listening on port 3000");
});
