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
            await initDatabaseData();
            await setSetting('timetable_generation_date', parser.getTimetableGenerationDate());
        } catch (err) {
            console.error("Error while updating the DB data", err);
            return;
        };
    };


    // console.log("Started reading the timetables");
    // console.log(`Timetable generation data: '${parser.getTimeTableGenerationData()}'`);
    // console.log("Succesfully read and created the timetables", '\n');

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
            \`teacher\`       VARCHAR(40)     NOT NULL,
            \`teacher_id\`    CHAR(2)         NOT NULL,
            \`classes\`       VARCHAR(20)     NOT NULL,
            \`subject\`       VARCHAR(20)     NOT NULL,
            \`classroom\`     VARCHAR(20)     NOT NULL,
            \`day_num\`       INT             NOT NULL,
            \`lesson_num\`    INT             NOT NULL
        );`;
        await con.promise().query(sql);

        // create table: broken_timetable
        sql = `CREATE TABLE IF NOT EXISTS \`planbot\`.\`broken_timetable\` (
            \`id\`            INT             PRIMARY KEY NOT NULL AUTO_INCREMENT,
            \`teacher\`       VARCHAR(40)     NOT NULL,
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

async function initDatabaseData () {
    try {   
        // truncate old data
        let sql = `TRUNCATE \`planbot\`.\`broken_timetable\`;`;
        await con.promise().query(sql);

        sql = `TRUNCATE \`planbot\`.\`timetable\`;`;
        await con.promise().query(sql);
        
        return;
        sql = `INSERT INTO \`planbot\`.\`timetable\`
            (\`teacher\`, \`teacher_id\`, \`classes\`, \`subject\`, \`classroom\`, \`day_num\`, \`lesson_num\`) 
            VALUES ?;`;
        let values = [];

        await con.promise().query(sql, [values], (err, result) => {
            if (err) throw err;
            console.log(`Successfully inserted ${result.affectedRows} rows into the 'timetable' table`);
        });
    } catch (err) {
        throw err;
    };

//   con.query(sql, [values], function (err, result) {
//     if (err) throw err;
//     console.log("Number of records inserted: " + result.affectedRows);
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
        const [ result, _ ] = await con.promise().query(query, [key]);
        return result?.[0]?.value;
    } catch (err) {
        throw err;
    };
};