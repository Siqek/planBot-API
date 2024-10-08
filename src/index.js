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

    console.log("Started reading the timetables");
    await parser.initParser();
    console.log(`Timetable generation data: '${parser.getTimeTableGenerationData()}'`);
    await parser.createTimeTables();
    console.log("Succesfully read and created the timetables");

    app.listen(port, async () => {
        console.log(`API works! Listening to port ${port}`)
    }); 
};
