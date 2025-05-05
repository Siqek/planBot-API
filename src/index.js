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
    namedPlaceholders: true,
});

app.use(cors());

app.get('/', (req, res) => {
    res.status(200).send("OK");
});

app.get('/lesson', (req, res) => {
    const day = req.query.day;
    const lesson = req.query.lesson;
    const teacher_id = req.query.teacher_id ?? '%';
    const teacher_name = req.query.teacher_name ?? '%';
    const classes = req.query.classes ?? '%';
    const classroom = req.query.classroom ?? '%';

    if (!day) {
        res.status(400).send({ error: "Missing required parameter: 'day'" });
        return;
    };

    if (!lesson) {
        res.status(400).send({ error: "Missing required parameter: 'lesson'" });
        return;
    };

    const sql = `SELECT timetable.teacher_id, teachers.name AS teacher_name, subject, classes, classroom, day_num, lesson_num
    FROM planbot.timetable
    JOIN planbot.teachers ON timetable.teacher_id = teachers.id
    WHERE
        day_num = :day
        AND lesson_num = :lesson
        AND LOWER(teacher_id) LIKE LOWER(:teacher_id)
        AND LOWER(teachers.name) LIKE LOWER(:teacher_name)
        AND LOWER(classes) LIKE LOWER(:classes)
        AND LOWER(classroom) LIKE LOWER(:classroom);`;
    con.query(sql, {day: day, lesson: lesson, teacher_id: teacher_id, teacher_name: teacher_name, classes: classes, classroom: classroom}, (err, result, _) => {
        if (err) {
            res.status(500).json({ error: 'Internal server error' });
            console.error(err);
        } else {
            res.status(200).send(result);
        };
    });
});

app.get('/lesson/next-available', (req, res) => {
    const day = req.query.day;
    const lesson = req.query.lesson;
    const teacher_id = req.query.teacher_id ?? '%';
    const teacher_name = req.query.teacher_name ?? '%';
    const classes = req.query.classes ?? '%';
    const classroom = req.query.classroom ?? '%';

    if (!day) {
        res.status(400).send({ error: "Missing required parameter: 'day'"});
        return;
    }

    if (!lesson) {
        res.status(400).send({ error: "Missing required parameter: 'lesson'"});
        return;
    }

    const sql = `SELECT teacher_id, teachers.name as teacher_name, classes, subject, classroom, day_num, lesson_num
    FROM planbot.timetable
    JOIN planbot.teachers ON timetable.teacher_id = teachers.id
    WHERE
        LOWER(teacher_id) LIKE LOWER(:teacher_id)
        AND LOWER(teachers.name) LIKE LOWER(:teacher_name)
        AND LOWER(classes) LIKE LOWER(:classes)
        AND LOWER(classroom) LIKE LOWER(:classroom)
        AND
        (
            (lesson_num >= :lesson AND day_num >= :day)
            OR day_num >= :day + 1
        )
    ORDER BY day_num, lesson_num;`;
    con.query(sql, {day: day, lesson: lesson, teacher_id: teacher_id, teacher_name: teacher_name, classes: classes, classroom: classroom}, (err, result, _) => {
        if (err) {
            res.status(500).json({ error: 'Internal server error' });
            console.error(err);
        } else {
            let filteredResult = [];

            const day_num = result[0]?.day_num;
            const lesson_num = result[0]?.lesson_num;

            for (const row of result) {
                if (row.day_num != day_num || row.lesson_num != lesson_num)
                    break;

                filteredResult.push(row);
            }

            res.status(200).send(filteredResult);
        }
    });
});

app.get('/day', (req, res) => {
    const day = req.query.day;
    const teacher_id = req.query.teacher_id ?? '%';
    const teacher_name = req.query.teacher_name ?? '%';
    const classes = req.query.classes ?? '%';
    const classroom = req.query.classroom ?? '%';

    if (!day) {
        res.status(400).send({ error: "Missing required parameter: 'day'" });
        return;
    }

    const sql = `SELECT timetable.teacher_id, teachers.name AS teacher_name, subject, classes, classroom, day_num, lesson_num
    FROM planbot.timetable
    JOIN planbot.teachers ON timetable.teacher_id = teachers.id
    WHERE
        day_num = :day
        AND LOWER(teacher_id) LIKE LOWER(:teacher_id)
        AND LOWER(teachers.name) LIKE LOWER(:teacher_name)
        AND LOWER(classes) LIKE LOWER(:classes)
        AND LOWER(classroom) LIKE LOWER(:classroom)
    ORDER BY lesson_num;`;
    con.query(sql, {day: day, teacher_id: teacher_id, teacher_name: teacher_name, classes: classes, classroom: classroom}, (err, result, _) => {
        if (err) {
            res.status(500).json({ error: 'Internal server error' });
            console.error(err);
        } else {
            res.status(200).send(result);
        }
    });
});

app.get('/teachers', (req, res) => {
    const sql = `SELECT * FROM \`planbot\`.\`teachers\`;`;
    con.query(sql, (err, result, _) => {
        if (err) {
            res.status(500).json({ error: 'Internal server error' });
            console.error(err);
        } else {
            res.status(200).json(result);
        };
    });
});

app.get('/classes', (req, res) => {
    const sql = `SELECT \`class\` FROM \`planbot\`.\`classes\`;`;
    con.query(sql, (err, result, _) => {
        if (err) {
            res.status(500).json({ error: 'Internal server error' });
            console.error(err);
        } else {
            res.status(200).json(result.map(r => r.class));
        };
    });
});

app.get('/classrooms', (req, res) => {
    const sql = `SELECT DISTINCT \`classroom\` FROM \`planbot\`.\`timetable\`;`;
    con.query(sql, (err, result, _) => {
        if (err) {
            res.status(500).json({ error: 'Internal server error' });
            console.error(err);
        } else {
            res.status(200).json(result.map(r => r.classroom));
        };
    });
});

app.get('/classrooms/available', (req, res) => {
    const day = req.query.day;
    const lesson = req.query.lesson;

    if (!day) {
        res.status(400).send({ error: "Missing required parameter: 'day'" });
        return;
    };

    if (!lesson) {
        res.status(400).send({ error: "Missing required parameter: 'lesson'" });
        return;
    };

    const sql = `SELECT DISTINCT t1.classroom
    FROM planbot.timetable t1
    LEFT JOIN planbot.timetable t2
        ON t1.classroom = t2.classroom
        AND t2.lesson_num = :lesson
        AND t2.day_num = :day
    WHERE t2.classroom IS NULL;`;
    con.query(sql, {day: day, lesson: lesson}, (err, result, _) => {
        if (err) {
            res.status(500).json({ error: 'Internal server error' });
            console.error(err);
        } else {
            res.status(200).json(result.map(r => r.classroom));
        };
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
            await initDatabaseData(parser.getTimetables(), parser.getBrokenTimetables());
            await setSetting('timetable_generation_date', parser.getTimetableGenerationDate());
        } catch (err) {
            console.error("Error while updating the DB data", err);
            return;
        };
    };

    app.listen(port, () => console.log(`API works! Listening to port ${port}`));
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
        let sql = `CREATE DATABASE IF NOT EXISTS \`planbot\` COLLATE utf8mb4_bin;`;
        await con.promise().query(sql);

        // create table: app_config
        sql = `CREATE TABLE IF NOT EXISTS \`planbot\`.\`app_config\` (
            \`id\`            INT             PRIMARY KEY NOT NULL AUTO_INCREMENT,
            \`key\`           VARCHAR(255)    NOT NULL UNIQUE,
            \`value\`         TEXT            NOT NULL,
            \`updated_at\`    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
        );`;
        await con.promise().query(sql);

        // create table: teachers
        sql = `CREATE TABLE IF NOT EXISTS \`planbot\`.\`teachers\` (
            \`id\`            CHAR(2)         PRIMARY KEY NOT NULL UNIQUE,
            \`name\`          VARCHAR(30)     NOT NULL
        );`;
        await con.promise().query(sql);

        // create table: classes
        sql = `CREATE TABLE IF NOT EXISTS \`planbot\`.\`classes\` (
            \`class\`         VARCHAR(4)      PRIMARY KEY NOT NULL UNIQUE
        );`;
        await con.promise().query(sql);

        // create table: timetable
        sql = `CREATE TABLE IF NOT EXISTS \`planbot\`.\`timetable\` (
            \`id\`            INT             PRIMARY KEY NOT NULL AUTO_INCREMENT,
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
            \`teacher_id\`    CHAR(2)         NOT NULL,
            \`data\`          VARCHAR(50)     NOT NULL,
            \`day_num\`       INT             NOT NULL,
            \`lesson_num\`    INT             NOT NULL
        );`;
        await con.promise().query(sql);
    } catch (err) {
        throw err;
    };
};

async function initDatabaseData (data, brokenData) {
    // truncate old data and insert new
    try {
        // truncate old data
        let sql = `TRUNCATE \`planbot\`.\`broken_timetable\`;`;
        await con.promise().query(sql);

        sql = `TRUNCATE \`planbot\`.\`timetable\`;`;
        await con.promise().query(sql);

        sql = `TRUNCATE \`planbot\`.\`teachers\`;`;
        await con.promise().query(sql);

        sql = `TRUNCATE \`planbot\`.\`classes\`;`;
        await con.promise().query(sql);

        // prepare new data to insert
        let values = [];
        let teachers = [];
        let classesSet = new Set();

        data.forEach(({ teacher, timetable }) => {
            // gets the teacher's full name (format: initial.surname)
            let teacherName = teacher.trim().split(' ')?.[0]; // cuts off everything after the name
            // extracts teacher id (two letters in the brackets)
            let teacherId = teacher.match(/.{2}(?=\))/)?.[0]; // matches the two letters in the brackets

            teachers.push([ teacherId, teacherName ]);

            timetable.forEach(({ classes, subject, classroom, day, lesson }) => {
                classes.forEach(c => classesSet.add(c));

                // the order must be the same as in the query
                values.push([ teacherId, classes.join(';'), subject, classroom, day, lesson ]);
            });
        });

        // insert teachers
        sql = `INSERT INTO \`planbot\`.\`teachers\` (\`id\`, \`name\`)
        VALUES ?;`;
        if (teachers.length) {
            // execute the query
            let [ result ] = await con.promise().query(sql, [teachers]);
            console.log(`Successfully inserted ${result.affectedRows} rows into the 'teachers' table`);
        };

        // insert the data
        sql = `INSERT INTO \`planbot\`.\`timetable\`
        (\`teacher_id\`, \`classes\`, \`subject\`, \`classroom\`, \`day_num\`, \`lesson_num\`)
        VALUES ?;`;
        if (values.length) {
            let [ result ] = await con.promise().query(sql, [values]);
            console.log(`Successfully inserted ${result.affectedRows} rows into the 'timetable' table`);
        };

        // insert classes
        sql = `INSERT INTO \`planbot\`.\`classes\`
        (\`class\`) VALUES ?;`;
        if (classesSet.size) {
            let classes = [...classesSet].map(c => [c]);
            let [ result ] = await con.promise().query(sql, [classes]);
            console.log(`Successfully inserted ${result.affectedRows} rows into the 'classes' table`);
        };

        sql = `INSERT INTO \`planbot\`.\`broken_timetable\`
        (\`teacher_id\`, \`data\`, \`day_num\`, \`lesson_num\`)
        VALUES ?;`;
        values = [];

        brokenData.forEach(({ teacher, brokenTimetable }) => {
            // extracts teacher id (two letters in the brackets)
            let teacherId = teacher.match(/.{2}(?=\))/)?.[0]; // matches the two letters in the brackets

            brokenTimetable.forEach(({ brokenData: data, day, lesson }) => {
                // the order must be the same as in the query
                values.push([ teacherId, data, day, lesson ]);
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