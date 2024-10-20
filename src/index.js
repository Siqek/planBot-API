const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const app = express();

const Parser = require('./parser');

const port = 8080;

require('dotenv').config({ path: `${__dirname}\\..\\.env` });

let con = mysql.createConnection({
    host: 'db',
    user: 'root',
    password: `${process.env.DB_PASSWORD}`,
});

app.use(cors());

app.get('/', (req, res) => {
    res.send("OK");
});

app.get('/get', (req, res) => {
    const teacher = req.query.teacher ?? '';
    const className = req.query.class ?? '';
    const classroom = req.query.classroom ?? '';
    const lesson = req.query.lesson ?? '';
    const day = req.query.day ?? '';
    res.send(`${teacher} ${className} ${classroom} ${lesson} ${day}`);
});

app.get('/teachers', (req, res) => {
    const sql = `SELECT DISTINCT \`teacher\`, \`teacher_id\` FROM \`planbot\`.\`timetable\`;`;
    con.query(sql, (err, result, fields) => {
        if (err) {
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(200).json(result);
        }
    });
});

startServer().catch(err => {
    console.log("Error while starting the server: ", err);
});

async function startServer () {
    await connectToDB();
    try {
        console.log("Started initializing the DB structure");
        await initDatabaseStructure();
        console.log("DB structure initialization complete", '\n');
    } catch (err) {
        console.error("Error while initializing the DB structure", err);
        return;
    };

    const parser = new Parser();
    await parser.initParser();
    console.log('Parser initialized successfully', '\n');

    let timetableGenerationDate = await getSetting('timetable_generation_date');
    if (!timetableGenerationDate || new Date(timetableGenerationDate) < new Date(parser.getTimetableGenerationDate()))
    {
        try {
            await parser.createTimetables();
            await initDatabaseData([ parser.getTimetables(), parser.getBrokenTimetables() ]);
            // uncomment it later DEBUG TODO
            // await setSetting('timetable_generation_date', parser.getTimetableGenerationDate());
        } catch (err) {
            console.error("Error while updating the DB data", err);
            return;
        };
    };

    app.listen(port, async () => {
        console.log(`API works! Listening to port ${port}`)
    }); 
};


// database functions

function connectToDB ()
{
    return new Promise((resolve, reject) => {
        con.connect((err) => {
            if (err) {
                console.error(err);
                reject(err);
            }
            else {
                console.log('Connected to DB.');
                resolve();
            };
        });
    });
};

async function initDatabaseStructure () {
    // create the database structure
    try {
        // create database: planbot
        let sql = `CREATE DATABASE IF NOT EXISTS \`planbot\`;`;
        await con.promise().query(sql);

        // create table: app_config
        sql = `CREATE TABLE IF NOT EXISTS \`planbot\`.\`app_config\` (
            \`id\`            INT             PRIMARY KEY NOT NULL AUTO_INCREMENT,
            \`key\`           VARCHAR(255)    NOT NULL UNIQUE,
            \`value\`         TEXT            NOT NULL,
            \`updated_at\`    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
        );`;
        await con.promise().query(sql);

        // create table: timetable
        sql = `CREATE TABLE IF NOT EXISTS \`planbot\`.\`timetable\` (
            \`id\`            INT             PRIMARY KEY NOT NULL AUTO_INCREMENT,
            \`teacher\`       VARCHAR(30)     NOT NULL,
            \`teacher_id\`    CHAR(2)         NOT NULL,
            \`classes\`       VARCHAR(20)     NOT NULL,
            \`subject\`       VARCHAR(20)     NOT NULL,
            \`classroom\`     VARCHAR(10)     NOT NULL,
            \`day_num\`       INT             NOT NULL,
            \`lesson_num\`    INT             NOT NULL
        );`;
        await con.promise().query(sql);

        // create table: broken_timetable
        sql = `CREATE TABLE IF NOT EXISTS \`planbot\`.\`broken_timetable\` (
            \`id\`            INT             PRIMARY KEY NOT NULL AUTO_INCREMENT,
            \`teacher\`       VARCHAR(30)     NOT NULL,
            \`teacher_id\`    CHAR(2)         NOT NULL,
            \`data\`          VARCHAR(50)     NOT NULL,
            \`day_num\`       INT             NOT NULL,
            \`lesson_num\`    INT             NOT NULL
        );`;
        await con.promise().query(sql) ;
    } catch (err) {
        throw err;
    };
};

async function initDatabaseData ([ data, brokenData ]) {
    // truncate old data and insert new
    try {   
        // truncate old data
        let sql = `TRUNCATE \`planbot\`.\`broken_timetable\`;`;
        await con.promise().query(sql);

        sql = `TRUNCATE \`planbot\`.\`timetable\`;`;
        await con.promise().query(sql);
        
        // insert new data
        sql = `INSERT INTO \`planbot\`.\`timetable\`
            (\`teacher\`, \`teacher_id\`, \`classes\`, \`subject\`, \`classroom\`, \`day_num\`, \`lesson_num\`) 
            VALUES ?;`;
        let values = [];

        // prepare the data to insert
        data.forEach(({ teacher, timetable }) => {
            // gets the teacher's full name (format: initial.surname)
            let teacherName = teacher.trim().split(' ')?.[0]; // cuts off everything after the name
            // extracts teacher id (two letters in the brackets)
            let teacherId = teacher.match(/.{2}(?=\))/)?.[0]; // matches the two letters in the brackets

            timetable.forEach(({ class: className, subject, classroom, day, lesson }) => {
                // the order must be the same as in the query
                values.push([ teacherName, teacherId, className, subject, classroom, day, lesson ]);
            });
        });
    
        if (values.length) {
            // inserts the data
            let [ result ] = await con.promise().query(sql, [values]);
            console.log(`Successfully inserted ${result.affectedRows} rows into the 'timetable' table`);
        };

        sql = `INSERT INTO \`planbot\`.\`broken_timetable\`
            (\`teacher\`, \`teacher_id\`, \`data\`, \`day_num\`, \`lesson_num\`)
            VALUES ?;`;
        values = [];

        brokenData.forEach(({ teacher, brokenTimetable }) => {
            // gets the teacher's full name (format: initial.surname)
            let teacherName = teacher.trim().split(' ')?.[0]; // cuts off everything after the name
            // extracts teacher id (two letters in the brackets)
            let teacherId = teacher.match(/.{2}(?=\))/)?.[0]; // matches the two letters in the brackets

            brokenTimetable.forEach(({ brokenData: data, day, lesson }) => {
                // the order must be the same as in the query
                values.push([ teacherName, teacherId, data, day, lesson ]);
            });
        });

        if (values.length) {
            let [ result ] = await con.promise().query(sql, [values]);
            console.log(`Successfully inserted ${result.affectedRows} rows into the 'broken_timetable' table`);
        };
    } catch (err) {
        throw err;
    };
};

async function setSetting (key, value) {
    try {
        // insert a setting, or update it if it already exists
        const query = `INSERT INTO \`planbot\`.\`app_config\` (\`key\`, \`value\`) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
            \`value\` = VALUES(\`value\`),
            \`updated_at\` = CURRENT_TIMESTAMP;`;
        await con.promise().query(query, [key, value]);
    } catch (err) {
        throw err;
    };
};

async function getSetting (key) {
    try {
        // gets the setting value
        const query = `SELECT \`value\` FROM \`planbot\`.\`app_config\` WHERE \`key\` = ?`;
        const [ result ] = await con.promise().query(query, [key]);
        return result[0]?.value || null;
    } catch (err) {
        throw err;
    };
};