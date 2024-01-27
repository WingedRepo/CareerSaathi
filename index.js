import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "careersaathi",
  password: "surabhi",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentStudentID;
let message = "";
let currentProjectID;
let currentTechStacks;
let currentContributors;
let contributorDetails = [];

app.get("/", async (req, res) => {
    res.render("identification.ejs");
});

async function getProjectDetails(p_id) {
    currentProjectID = p_id;
    currentTechStacks = (await db.query("SELECT * FROM tech_stack WHERE p_id = $1", [p_id])).rows;
    currentContributors = (await db.query("SELECT * FROM contributer WHERE p_id = $1", [p_id])).rows;
    currentContributors.forEach(element => {
        contributorDetails.push((db.query("SELECT first_name, linkedin FROM student WHERE student_id = $1", [element.c_id])).rows);
    });    
}

app.post("/student-login", async (req, res) => {
  res.render("login.ejs");
});

app.post("/student-register", async (req, res) => {
    res.render("registration.ejs");
});

app.post("/login", async (req, res) => {
    const n1 = req.body.firstName;
    const n2 = req.body.lastName;
    const id = req.body.studentID;
    const c = req.body.course;
    const cem = req.body.collegeEmail;
    const p = req.body.password;
    const li = req.body.linkedin;

    try {
        await db.query("INSERT INTO student(student_id, first_name, last_name, course, college_email, pswd, linkedin) VALUES (LOWER($1), $2, $3, $4, $5, $6, $7)", [id, n1, n2, c, cem, p, li]);
        res.render("login.ejs");
    } catch (error) {
        console.log(error);
        res.render("registration.ejs");
    }
});

app.post("/home", async (req, res) => {
    const id = req.body.id;
    const pass = req.body.password;

    try {
        const data = await db.query("SELECT pswd FROM student WHERE student_id = $1", [id.toLowerCase()]);
        const correct_pswd = data.rows[0].pswd;
        if(pass == correct_pswd) {
            res.render("home.ejs");
            currentStudentID = id.toLowerCase();
            console.log(correct_pswd);
        }
        else {
            res.render("login.ejs");
        }
    } catch (error) {
        console.log(error);
        res.render("login.ejs");
    }
});

app.post("/submit-report", async (req, res) => {
    const s = req.body.subject;
    const c = req.body.concern;

    try {
        await db.query("INSERT INTO report(subject, concern, student_id) VALUES ($1, $2, $3)", [s, c, currentStudentID]);
        res.render("report.ejs", { successMessage: "Report submitted successfully!" });
    } catch (error) {
        console.log(error);
        res.render("report.ejs", { errorMessage: "Error submitting report." });
    }
});



app.get("/report", async (req, res) => {
    res.render("report.ejs");
});

app.get("/calendar", async (req, res) => {
    const data = await db.query("SELECT * FROM company");
    res.render("company.ejs", {
        companies: data.rows,
    });
});

app.get("/show-project", async (req, res) => {//////////****************************************** */
    const data = await db.query("SELECT * FROM project");
    res.render("show-project.ejs", {
        projects: data.rows,
    });
});

app.get("/add-project", async (req, res) => {
    res.render("add-project.ejs");
});

app.post("/add-project-details", async (req, res) => {
    const name = req.body.name;
    const dsc = req.body.description;
    const link = req.body.githubLink;
    const c = req.body.contributors;
    const tech = req.body.techStacks;
    const clist = req.body.contributors.split(",");    
    const tlist = req.body.techStacks.split(",");

    const pid = await db.query("INSERT INTO project(name, description, github_link, contributer, tech_stack) VALUES ($1, $2, $3, $4, $5) RETURNING id", [name, dsc, link, c, tech]);

    try {
        clist.forEach(cr => {
            db.query("INSERT INTO contributer(p_id, c_id) VALUES ($1, $2)", [pid, cr.trim().toLowerCase()]);
        });
    } catch (error) {
        console.log(error);
        console.log("Cant insert values to contributer table");
    }

    try {
        tlist.forEach(t => {
            db.query("INSERT INTO tech_stack(name, p_id) VALUES ($1, $2)", [t.trim().toLowerCase()], pid);
        });
    } catch (error) {
        console.log(error);
        console.log("Cant insert values to tech_stack table");
    }

    res.render("add-project.ejs");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
