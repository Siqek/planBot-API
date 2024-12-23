const parse5 = require('parse5');

module.exports = class Parser
{
    // private properties
    #timetables = [];
    #brokenTimetables = [];
    #urls = [];
    #timetableGenerationDate = null;


    // init functions
    async initParser ()
    {
        let html = await this.#getHtml('/lista.html');
        this.#urls = html.match(/plany\/n.*\.html/g); // finds all URLs to teachers' timetables

        html = await this.#getHtml(this.#urls[0]);
        // finds generation date and formats it in the format: YYYY-MM-DD
        this.#timetableGenerationDate = html.match(/(?<=wygenerowano\s*)(\d{2})\.(\d{2})\.(\d{4})/)?.slice(1).reverse().join('-') || null;
    };


    // constructor
    constructor () {
        
        // init vars
        this.#timetables = [];
        this.#brokenTimetables = []
        this.#urls = [];
    };


    // accessors
    getTimetables () {
        return this.#timetables;
    };

    getBrokenTimetables () {
        return this.#brokenTimetables;
    };

    getTimetableGenerationDate () {
        return this.#timetableGenerationDate;
    };
    

    // public methods
    async createTimetables ()
    {
        // a way to avoid writing '.bind(this)' every time the function is called
        // const findTeacherName = _findTeacherName.bind(this);
        
        for (let i=0; i < this.#urls.length; ++i)
        {
            const html = await this.#getHtml(this.#urls[i]); // gets the HTML for the teacher's timetable
            const document = parse5.parse(html);
            const teacherName = findTeacherName.bind(this)(document);
            if (teacherName)
            {
                // filters vacant positions
                if (teacherName.includes('vacat') || teacherName.includes('vakat'))
                    continue;
    
                const parsedData = parseTable.bind(this)(findTable.bind(this)(document));
    
                // filters empty tables
                if (!parsedData.result || parsedData.result.length < 1)
                    continue;

                if (parsedData.brokenData.length) {
                    this.#brokenTimetables.push({
                        teacher: teacherName,
                        brokenTimetable: parsedData.brokenData
                    });
                };

                this.#timetables.push({
                    teacher: teacherName,
                    timetable: parsedData.result
                });
    
                // console.log(`${teacherName}: ${parsedData.result.length}`); // DEBUG
            };
        };

        function findTeacherName (node) {
            return this.#findNode(node, (node) => 
                node.tagName === 'span' && 
                node.attrs?.some(a => a.name === 'class' && a.value === 'tytulnapis')
            )?.childNodes[0].value || null;
        };
    
        function findTable (node) {
            return this.#findNode(node, (node) =>
                node.tagName === 'table'
                && node.attrs?.some(a => a.name === 'class' && a.value === 'tabela')
            ) || null;
        };

        function parseTable (node) {
            const result = [];
            const brokenData = [];
        
            const tbody = node.childNodes.find(n => n.tagName == "tbody");
        
            const trs = tbody.childNodes.filter(n => n.tagName == "tr");
        
            for (let i=1; i < trs.length; ++i) // (i=1) skips a row with headers
            {
                const tds = trs[i].childNodes.filter(n => n.tagName == 'td');
        
                for (let j=2; j < tds.length; ++j) // (j=2) skips 2 columns
                {
                    var lessonInfo = parseTd(tds[j]);
                    
                    if (!lessonInfo)
                        continue;

                    lessonInfo.lesson = i - 1;
                    lessonInfo.day = j - 2;

                    if (lessonInfo?.brokenData)
                        brokenData.push(lessonInfo);
                    else
                        result.push(lessonInfo);
                };
            };
        
            return { result: result, brokenData: brokenData };
        
            function parseTd(node)
            {
                let result = {};
    
                // finds and handles specific elements
                for (let child of node.childNodes)
                {
                    // if there is an additional span
                    if (child.tagName == 'span' && child.attrs && child.attrs.some(a => a.name == 'style'))
                        return parseTd(child);
        
                    // class
                    if (child.tagName == 'a' && child.attrs && child.attrs.some(a => a.name == 'class' && a.value == 'o')) {
                        if (!result.classes) result.classes = [];
                        result.classes.push(child.childNodes[0].value);
                    };
        
                    // classroom
                    if ((child.tagName == 'a' || child.tagName == 'span') && child.attrs && child.attrs.some(a => a.name == 'class' && a.value == 's'))
                        result.classroom = child.childNodes[0].value;
        
                    // subject
                    if (child.tagName == 'span' && child.attrs && child.attrs.some(a => a.name == 'class' && a.value == 'p'))
                        result.subject = child.childNodes[0].value;

                    // read broken data
                    if (child.nodeName == "#text" && child?.value.trim().length)
                        result.brokenData = child.value;
                };

                // there is only lesson as broken data
                if (result.brokenData && Object.keys(result).length == 1)
                    return result;

                // delete useless property
                if (result.brokenData)
                    delete result.brokenData;

                // there is no data
                if (Object.keys(result).length)
                    return result;
            };
        };
    };


    // private methods
    async #getHtml (url) {
        const res = await fetch(`${process.env.url}/${url}`);
        const html = await res.text();
        return html;
    };

    #findNode (node, matcher)
    {
        if (matcher(node)) {
            return node;
        };

        if (node.childNodes)
        {
            for (let child of node.childNodes)
            {
                const found = this.#findNode(child, matcher);
                if (found)
                    return found;
            };
        };

        return null;
    };
};
