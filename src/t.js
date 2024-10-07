const Parser = require('./parser');

const t = new Parser();

require('dotenv').config({ path: `${__dirname}\\..\\.env`});

(async () => {
    await t.createTimeTables();
    console.log(t.getTimeTables().length);
    t.getTimeTables().forEach(timeTable => {
        // gets the teacher's full name (format: initial.surname)
        let teacherName = timeTable.teacherName.trim().split(' ')?.[0]; // cuts off everything after the name
        // extracts teacher id (two letters in the brackets)
        let teacherId = timeTable.teacherName.match(/.{2}(?=\))/)?.[0]; // matches the two letters in the brackets
        console.log(teacherName, teacherId)
    })
})//();