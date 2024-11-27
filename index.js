const express = require("express");
const { program } = require("commander");
const fs = require("fs");
const multer = require("multer");


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

const saveCache = () => {
  fs.writeFileSync(
    options.cache,
    JSON.stringify(Object.values(notes), null, 2)
  );
  console.log(`Cache saved to ${options.cache}`);
};

app.get("/notes/:name", (req, res) => {
  // console.log("Request params:", req.params);
  // console.log("Request headers:", req.headers);

  // const storage = multer.memoryStorage();
  // const upload = multer({ storage: storage });
  const noteName = req.params.name;
  
  if (notes[noteName]) {
    // res.status(200).json({ text: notes[noteName].note });
    res.status(200).send(notes[noteName].note);
  } else {
    res.status(404).send("Note not found");
  }
});



app.get("/notes", (req, res) => {
  const noteList = Object.keys(notes).map((name) => ({
    name: name,
    text: notes[name].note,
  }));

  res.status(200).json(noteList);
});




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
