const config = require("../config.json")
const { getS3Item, putS3Item } = require("../auxilliaryFunctions/s3")
const { parseBody, getTime } = require("../auxilliaryFunctions/formatting")
const iconv = require("iconv-lite");

// main TODO
module.exports = {
    name: "POST/exec/democracy/edit",
    description: "Democracy: Edit an Article Viewer",
    execute: async(event, verification) => {
        const inputBody = await parseBody(event.body);

        // user access levels
        if(["chair","admin"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        // retrieves the file
        const democracyPage = require("./democracyView")
        if(!inputBody.article){
            return await democracyPage.execute(event,verification);
        }
        let file = {}
        try {
            file = await getS3Item(config.buckets.operational, `democracy/${inputBody.article}.json`);
            file = JSON.parse(file);
        } catch(err) {
            return await democracyPage.execute(event,verification);
        }

        // now goes through each item
        let success = [];
        let failure = [];

        // content
        if(inputBody.content){
            // normalises dodgy quotation marks
            let buffer = Buffer.from(inputBody.content, "binary");
            let fixedString = iconv.decode(buffer, 'win1252');
            fixedString = fixedString
                .replace(/â€™/g, "'")
                .replace(/â€˜/g, "'")
                .replace(/â€œ/g, '"')
                .replace(/â€/g, '"')
                .replace(/â€“/g, '-')
                .replace(/Â/g, '')
                .replace(/\u00E2\u20AC\uFFFD/g, "'");
            
                // tests
            if(/^[A-Za-z0-9 \n\-.,#\[\]\(\)_\/\*:'@~%£!\?‘’"`;\s–“”+&\\]{1,1000000}$/.test(fixedString) == false){
                failure.push("Content invalid. Use 1–1,000,000 chars: A–Z a–z 0–9 spaces, new lines, and - . , # [ ] ( ) _ / * : ' @ ~ % £ ! ? ‘ ’ ` ; \" “ ” + & \\");
            } else {
                success.push(`Successfully changed content of this article`);
                file.markdownData = fixedString;
            }
        } else {
            failure.push("No Content Provided")
        }

        // makes updates
        if(success.length != 0){
            // updates files
            file.edit = getTime()
            await putS3Item(JSON.stringify(file), config.buckets.operational, `democracy/${inputBody.article}.json`)

            // logbook changes
            let logBook = []
            try {
                logBook = await getS3Item(config.buckets.operational,`logs/democracy/${inputBody.article}.json`)
                logBook = JSON.parse(logBook);
            } catch(err){
                logBook = [];
            }
            logBook.push({
                time: getTime(),
                person: verification.cis,
                notes:success
            })
            try {
                await putS3Item(JSON.stringify(logBook),config.buckets.operational, `logs/democracy/${inputBody.article}.json`)
            } catch(err){}
        }

        // sends note
        const processNote = require("./processNotice");
        event.processName = "Edit a Democracy Article";
        event.processRemarks = `<b>Successes:</b><br>${success.join("<br>")} <br><br> <b>Failures:</b><br>${failure.join("<br>")}<br><br>`;
        if(success.length != 0){
            event.processRemarks += `<b>Changes have been made</b>`;
            event.allowBack = false;
            event.otherLink = `/democracy?doc=min&id=${inputBody.article}`;
            if(inputBody.article == "0-standing-orders"){
                event.otherLink = `/democracy?doc=so`;
            }
        } else {
            event.processRemarks += `<b>NO CHANGES HAVE BEEN MADE</b>`;
            event.allowBack = true;
        }
        return await processNote.execute(event,verification)
    }
}