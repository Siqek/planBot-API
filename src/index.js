const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const app = express();

const port = 8080;

require('dotenv').config({ path: `${__dirname}\\..\\.env` });

var con = mysql.createConnection({
    host: 'db',
    user: 'root',
    password: `${process.env.DB_PASSWORD}`,
});

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

const Parser = require('./parser');
const parser = new Parser();

app.use(cors());

app.get('/', (req, res) => {
    res.send("OK");
});

app.get('/test', (req, res) => {
    res.send(parser.getTimeTables());
});

app.get('/broken', (req, res) => {
    res.send(parser.getBrokenTimeTables());
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
        console.error(err);
        return;
    };

    console.log("Started reading the timetables");
    await parser.initParser();
    console.log(`Timetable generation data: '${parser.getTimeTableGenerationData()}'`);
    await parser.createTimeTables();
    console.log("Succesfully read and created the timetables", '\n');

    app.listen(port, async () => {
        console.log(`API works! Listening to port ${port}`)
    }); 
};

async function initDatabaseStructure () {
    // create the database structure
    try {
        // create database: timetable
        let sql = `CREATE DATABASE IF NOT EXISTS \`timetable\`;`;
        await con.promise().query(sql);

        //create table: app_config
        sql = `CREATE TABLE IF NOT EXISTS \`timetable\`.\`app_config\` (
            \`id\`            INT             PRIMARY KEY NOT NULL AUTO_INCREMENT,
            \`key\`           VARCHAR(255)    NOT NULL UNIQUE,
            \`value\`         TEXT            NOT NULL,
            \`updated_at\`    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
        );`;
        await con.promise().query(sql);

        //create table: timetable
        sql = `CREATE TABLE IF NOT EXISTS \`timetable\`.\`timetable\` (
            \`ID\`            INT             PRIMARY KEY NOT NULL AUTO_INCREMENT,
            \`teacher\`       VARCHAR(40)     NOT NULL,
            \`teacherID\`     CHAR(2)         NOT NULL,
            \`classes\`       VARCHAR(20)     NOT NULL,
            \`subject\`       VARCHAR(20)     NOT NULL,
            \`classroom\`     VARCHAR(20)     NOT NULL,
            \`day_num\`       INT             NOT NULL,
            \`lesson_num\`    INT             NOT NULL
        );`;
        await con.promise().query(sql);
    } catch (err) {
        throw err;
    };
};