import express, { response } from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import cors from "cors";
import knex from "knex";

const db = knex({
  client: "pg",
  connection: {
    connectionString:
      "postgresql://smart_brain_db_ccg3_user:nLJ3a8pzLYV5eWTvuq2ei0QpOCaT7SKv@dpg-d471f6idbo4c739jmgcg-a/smart_brain_db_ccg3",
    ssl: { rejectUnauthorized: false }, // needed for Render Postgres
  },
});

export default db;

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
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ message: "Incorrect form submission" });
    }

    const saltRounds = 10;
    const hash = bcrypt.hashSync(password, saltRounds);

    const newUser = await db.transaction(async (trx) => {
      const [loginEmail] = await trx("login")
        .insert({ hash, email })
        .returning("email");

      const [user] = await trx("users")
        .insert({
          email: loginEmail.email || loginEmail,
          name,
          joined: new Date(),
        })
        .returning("*");

      return user;
    });

    return res.status(200).json(newUser);
  } catch (err) {
    if (!res.headersSent) {
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }
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
