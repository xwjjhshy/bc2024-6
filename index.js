const express = require("express");
const { program } = require("commander");
const fs = require("fs");
const multer = require("multer");

const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");




const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

program
  .requiredOption("-h, --host <host>")
  .requiredOption("-p, --port <port>")
  .requiredOption("-c, --cache <cache>")
  .parse();

const options = program.opts();

if (!options.host || !options.port || !options.cache) {
  console.error(
    "Error: all parameters (--host, --port, --cache) must be provided."
  );

  process.exit(1);
}












const swaggerOptions = {
  definition: {
    openapi: "3.0.0", 
    info: {
      title: "Notes App API",
      version: "1.0.0", 
      description: "API documentation for Notes App",
    },
  },
  apis: ["./index.js"], 
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);












let notes = {};

if (fs.existsSync(options.cache)) {
  try {
    const data = fs.readFileSync(options.cache, "utf8");
    const cacheNotes = JSON.parse(data);

    notes = cacheNotes.reduce((acc, { note_name, note }) => {
      acc[note_name] = { note_name, note };
      return acc;
    }, {});

    console.log(`Cache file loaded from ${options.cache}`);
  } catch (error) {
    console.error("Error reading cache file:", error);
    process.exit(1);
  }
} else {
  fs.writeFileSync(options.cache, JSON.stringify([]));
  console.log(`Cache file created at ${options.cache}`);
}

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));


const saveCache = () => {
  fs.writeFileSync(
    options.cache,
    JSON.stringify(Object.values(notes), null, 2)
  );
  console.log(`Cache saved to ${options.cache}`);
};






/**
 * @swagger
 * /notes/{name}:
 *   get:
 *     summary: Get a specific note by name
 *     description: Retrieve a single note using its name.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the note to retrieve.
 *     responses:
 *       200:
 *         description: A single note
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 text:
 *                   type: string
 *       404:
 *         description: Note not found
 */
app.get("/notes/:name", (req, res) => {
  // console.log("Request params:", req.params);
  // console.log("Request headers:", req.headers);

  // const storage = multer.memoryStorage();
  // const upload = multer({ storage: storage });
  const noteName = req.params.name;
  // console.log('name')

  if (notes[noteName]) {
    // res.status(200).json({ text: notes[noteName].note });
    res.status(200).send(notes[noteName].note);
  } else {
    res.status(404).send("Note not found");
  }
});


/**
 * @swagger
 * /notes:
 *   get:
 *     summary: Get all notes
 *     description: Retrieve all notes stored in the application.
 *     responses:
 *       200:
 *         description: A list of notes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   text:
 *                     type: string
 */
app.get("/notes", (req, res) => {
  const noteList = Object.keys(notes).map((name) => ({
    name: name,
    text: notes[name].note,
  }));

  res.status(200).json(noteList);
});










/**
 * @swagger
 * /notes/{name}:
 *   put:
 *     summary: Update an existing note
 *     description: Update a note's text by its name.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the note to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Note updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Note not found
 */
app.put("/notes/:name", (req, res) => {
  const noteName = req.params.name;
  const newText = req.body.text;

  if (notes[noteName]) {
    notes[noteName].note = newText;
    saveCache();
    res.status(200).send("Note updated");
  } else {
    res.status(404).send("Note not found");
  }
});












/**
 * @swagger
 * /notes/{name}:
 *   delete:
 *     summary: Delete a note by name
 *     description: Remove a note using its name.
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the note to delete.
 *     responses:
 *       200:
 *         description: Note deleted successfully
 *       404:
 *         description: Note not found
 */
app.delete("/notes/:name", (req, res) => {
  const noteName = req.params.name;

  if (notes[noteName]) {
    delete notes[noteName];
    saveCache();
    res.status(200).send("Note deleted");
  } else {
    res.status(404).send("Note not found");
  }
});












/**
 * @swagger
 * /write:
 *   post:
 *     summary: Create a new note via form data
 *     description: Create a new note with a name and text provided in the form data.
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               note_name:
 *                 type: string
 *                 description: The name of the note to create.
 *               note:
 *                 type: string
 *                 description: The text content of the note.
 *               name:
 *                 type: string
 *                 description: Alternative name field for the note.
 *               text:
 *                 type: string
 *                 description: Alternative text field for the note.
 *     responses:
 *       201:
 *         description: Note created successfully
 *       400:
 *         description: Note with the same name already exists
 */
app.post("/write", upload.none(), (req, res) => {
  const noteName = req.body.note_name || req.body.name;
  const noteText = req.body.note || req.body.text;

  if (notes[noteName]) {
    return res.status(400).send("Note with this name already exists");
  }

  notes[noteName] = {
    note_name: noteName,
    note: noteText,
  };

  saveCache();
  res.status(201).send("Note created");
});

app.listen(options.port, options.host, () => {
  console.log(`Server started on ${options.host}:${options.port}`);
});