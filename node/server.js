import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import dotenv from "dotenv";
import expressLayouts from "express-ejs-layouts";
import open from "open";
import fs from "fs/promises";
import crypto from "crypto";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;
const GH = "https://api.github.com";

// PROJECTS - CHOOSE ONE
//const projects = ["devops", "cicd"]
const projects = ["tests", ""]

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layout"); // => views/layout.ejs
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // optionnel pour CSS/images
app.use(express.json());

function ghHeaders() {
  const h = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) h["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

function parseRepoUrl(repoUrl) {
  if (!repoUrl) return {};
  const m = repoUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!m) return {};
  return { owner: m[1], repo: m[2] };
}

async function fetchBranches(owner, repo) {
  const url = `${GH}/repos/${owner}/${repo}/branches?per_page=100`;
  const r = await fetch(url, { headers: ghHeaders() });
  if (!r.ok) throw new Error(`GitHub branches error ${r.status}`);
  const data = await r.json();
  return data.map((b) => b.name);
}

async function fetchAllCommits({ owner, repo, branch, since }) {
  const perPage = 100;
  let page = 1;
  let all = [];
  let keep = true;
  while (keep) {
    const params = new URLSearchParams({ sha: branch, per_page: `${perPage}`, page: `${page}` });
    if (since) params.set("since", since);
    const url = `${GH}/repos/${owner}/${repo}/commits?${params}`;
    const r = await fetch(url, { headers: ghHeaders() });
    if (!r.ok) return [];
    const batch = await r.json();
    all = all.concat(batch);
    keep = batch.length === perPage;
    page++;
  }
  return all;
}

function groom(commit) {
  let duration = 0;
  let status = "";
  let project = ""; // Initialize project variable
  const lines = commit.commit.message.split("\n").filter((l) => l.trim() !== "");

  if (lines.length > 2) { // Ensure there are at least three lines
    const metaLine = lines[1]; // Second line for metadata
    const matches = [...metaLine.matchAll(/\[(.*?)\]/g)].map((m) => m[1]);

    if (matches.length) {
      for (const m of matches) {
        const nums = m.match(/\d+/g);
        if (!nums) {
          status = m; // This is the status
        } else {
          nums.forEach((n) => {
            duration = duration * 60 + parseInt(n, 10); // Convert time into total minutes
          });
        }
      }
    }

    project = lines[2].trim(); // Set project name from the third line
    if (!project.startsWith("{")) {
      project = ""; // Set to empty string if it doesn't start with '{'
    } else {
      project = project.slice(1, -1).trim(); // Remove the surrounding '{' and '}'
    }

    console.log(project);
  }

  return {
    sha: commit.sha,
    name: lines[0] || commit.commit.message.split("\n")[0], // Commit title from the first line
    description: lines.slice(3).join("\n"), // Remaining lines are the description
    date: commit.commit.author.date,
    duration,
    status,
    author: commit.author?.login || commit.commit?.author?.name || "?",
    url: commit.html_url,
    project // Include project name
  };
}


function totalDuration(commits) {
  const mins = commits.reduce((acc, c) => acc + (Number(c.duration) || 0), 0);
  const h = Math.floor(mins / 60),
    m = mins % 60;
  return { minutes: mins, h, m };
}

// helpers de format
const fmtDayLabel = (d) =>
  new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));

const toDayKey = (isoLike) => new Date(isoLike).toISOString().slice(0, 10); // "YYYY-MM-DD"

const sumMinutes = (items) => items.reduce((acc, c) => acc + (c.duration || 0), 0);

// entries: [{ date: ISO, duration: minutes, ... }]
function groupByDay(entries) {
  // assure l'ordre chronologique croissant (ou inverse si tu préfères)
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));

  const groupsMap = new Map(); // préserve l'ordre d'insertion
  for (const c of sorted) {
    const key = toDayKey(c.date);
    if (!groupsMap.has(key)) groupsMap.set(key, []);
    groupsMap.get(key).push(c);
  }

  // transforme en array de groupes avec label + totals
  const groups = [];
  for (const [day, commits] of groupsMap.entries()) {
    const minutes = sumMinutes(commits);
    groups.push({
      day, // "2025-01-10"
      label: fmtDayLabel(day), // "10 janv. 2025"
      commits,
      total: {
        minutes,
        h: Math.floor(minutes / 60),
        m: minutes % 60
      }
    });
  }
  return groups;
}

// === Exceptions.json (lecture/écriture) ===
const DATA_DIR = path.join(__dirname, "data");
const EXCEPTIONS_PATH = path.join(DATA_DIR, "exceptions.json");

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(EXCEPTIONS_PATH);
  } catch {
    await fs.writeFile(EXCEPTIONS_PATH, "[]", "utf-8");
  }
}

async function readExceptions() {
  await ensureDataFile();
  const raw = await fs.readFile(EXCEPTIONS_PATH, "utf-8");
  const arr = JSON.parse(raw);
  // normalisation très légère
  return Array.isArray(arr) ? arr : [];
}

async function writeExceptions(arr) {
  await ensureDataFile();
  await fs.writeFile(EXCEPTIONS_PATH, JSON.stringify(arr, null, 2), "utf-8");
}

function validateException(x) {
  // minimal: name, date (ISO), duration en minutes
  if (!x || typeof x !== "object") return "Objet invalide";
  if (!x.name) return "Champ 'name' requis";
  if (!x.date || isNaN(new Date(x.date))) return "Champ 'date' invalide (ISO attendu)";
  if (x.duration == null || isNaN(Number(x.duration))) return "Champ 'duration' requis (minutes)";
  return null;
}

// Page d'accueil + génération serveur
app.get(["/", "/jdt"], async (req, res) => {
  try {
    const defaultRepoUrl = process.env.REPO_URL || "";
    const { owner, repo } = parseRepoUrl(defaultRepoUrl);

    const since = process.env.JOURNAL_START_DATE
      ? new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }).format(new Date(process.env.JOURNAL_START_DATE))
      : null;
    const me = process.env.ME;

    const branch = process.env.BRANCH || "main";

    // ...
    const raw = await fetchAllCommits({ owner, repo, branch, since });
    const entries = await raw.map(groom).filter((c) => c.duration > 0);
    const myEntries = await entries.filter((c) => c.author == me && projects.includes(c.project));

    // lire les exceptions depuis le JSON
    const exc = await readExceptions();

    // Remplacer les commits par leur exceptions
    const keyOf = (x) => (x.sha || x.id || "").toLowerCase().trim();
    const excByKey = new Map(exc.map((x) => [keyOf(x), x]));
    const patched = myEntries.map((e) => {
      const repl = excByKey.get(keyOf(e));
      if (repl) {
        return repl; // remplace si une exception existe
      }
      return e;
    });
    // Ajouter les entrées "commitless"
    const allEntriesReady = patched.concat(exc.filter((e) => e.type == "commitless"));
    // grouper + totaux
    const groups = groupByDay(allEntriesReady);
    const totals = totalDuration(allEntriesReady);
    const projectName = process.env.PROJECT_NAME ?? repo;

    return res.render("index", {
      defaultRepoUrl,
      owner,
      repo,
      selectedBranch: branch,
      since,
      groups,
      totals,
      projectName,
      me
    });
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message);
  }
});

// POST créer une exception
app.post("/add", async (req, res) => {
  try {
    const err = validateException(req.body);
    if (err) return res.status(400).json({ error: err });

    if (req.body.exceptionId == "-") {
      if (req.body.sha == "-") {
        addNewCommitlessEntry(req.body);
      } else {
        addNewCommitPatchEntry(req.body);
      }
    } else {
      await patchExistingException(req.body);
    }
    return res.redirect("/jdt");
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function patchExistingException(ex) {
  const list = await readExceptions();
  const existing = list.find((e) => e.id == ex.exceptionId);
  existing.name = ex.name;
  existing.description = ex.description;
  existing.date = ex.date;
  existing.duration = Number(ex.duration) || 0;
  existing.author = ex.author;
  existing.status = ex.status;
  await writeExceptions(list);
}

async function addNewCommitlessEntry(ex) {
  const list = await readExceptions();
  const newentry = {
    id: crypto.randomUUID(),
    type: "commitless",
    name: ex.name,
    description: ex.description || "",
    date: new Date(ex.date).toISOString(),
    duration: Number(ex.duration) || 0,
    status: ex.status || "",
    author: process.env.ME
  };
  list.push(newentry);
  await writeExceptions(list);
}

async function addNewCommitPatchEntry(ex) {
  const list = await readExceptions();
  const newentry = {
    id: crypto.randomUUID(),
    type: "commitpatch",
    sha: ex.sha,
    url: ex.url,
    name: ex.name,
    description: ex.description || "",
    date: new Date(ex.date).toISOString(),
    duration: Number(ex.duration) || 0,
    status: ex.status || "Done",
    author: ex.author || "?",
    patch: true
  };
  list.push(newentry);
  await writeExceptions(list);
}

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}/jdt`;
  console.log(`Journal de travail dispo sur ${url}`);
  open(url); // 👈 ouvre automatiquement ton navigateur par défaut
});
