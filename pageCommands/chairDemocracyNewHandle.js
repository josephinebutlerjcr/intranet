const config = require("../config.json")
const { getS3Item, putS3Item } = require("../auxilliaryFunctions/s3")
const { parseBody, getTime } = require("../auxilliaryFunctions/formatting")
const iconv = require("iconv-lite");

// main
module.exports = {
    name: "POST/exec/democracy/new",
    description: "Create a new democracy minute HANDLER",
    execute: async(event, verification) => {
        // user access levels
        if(["chair","admin"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        // body
        const inputBody = await parseBody(event.body);
        const viewPage = require("./democracyView");

        // constructs a (blank) obhject
        let article = {
            published: getTime(),
            edit:getTime(),
            title:"",
            markdownData:""
        }

        // presense check on fields - exclusive to new
        if(!inputBody.title || !inputBody.content){
            event.error = "You are missing the mandatory fields: title, content";
            return await viewPage.execute(event,verification);
        }

        // ID generator - exclusive to new
        let acceptSlug = false; let iteration = 0; let slug = 0;
        while(acceptSlug == false){
            slug = generateSlugMinutes(getTime(), inputBody.title, iteration);
            try {
                await getS3Item(config.buckets.operational, `democracy/${slug}.json`)
            } catch(err){
                // if error, it doesnt exist, so we accept the slug
                acceptSlug = true
            }
        }

        let success = [];
        let failure = [];
        let update = true;

        // title
        if(/^[A-Za-z0-9 !'£?&.,()\-]{1,32}$/.test(inputBody.title) == false){
            failure.push("Title invalid; 1 to 32 characters, permitted: A-Z a-z 0-9 '-:,. and spaces only.");
            update = false;
        } else {
            success.push(`Successfully set article title to "${inputBody.title}"`);
            article.title = inputBody.title;
        }

        // content - COPIED FROM EDIT HANDLER because it is painful

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
            update = false
        } else {
            success.push(`Successfully added content of this article`);
            article.markdownData = fixedString;
        }

        // makes updates
        if(success.length == 0){update = false;}
        if(update){
            await putS3Item(JSON.stringify(article), config.buckets.operational, `democracy/${slug}.json`);

            success.push("Successfully Created Democracy Article")

            // logbook changes
            let logBook = []
            logBook.push({
                time: getTime(),
                person: verification.cis,
                notes:success
            })
            try {
                await putS3Item(JSON.stringify(logBook),config.buckets.operational, `logs/democracy/${slug}.json`)
            } catch(err){}
        }

        // sends note
        const processNote = require("./processNotice");
        event.processName = "Create a Democracy Article";
        event.processRemarks = `<b>Failures:</b> (no failures = nothing shows below)<br>${failure.join("<br>")}<br><br>`;
        if(update){
            event.processRemarks += `<b>ARTICLE HAS BEEN CREATED</b>`;
            event.allowBack = false;
            event.otherLink = `/democracy?id=${slug}&doc=min`
        } else {
            event.processRemarks += `<b>The document could not have been created due to the failures.</b>`;
            event.allowBack = true;
        }
        return await processNote.execute(event,verification)
    }
}

// slug generator
function generateSlugMinutes(time, name, iteration){
    const primary = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^-+|-+$/g, "");
    if(iteration == 0){
        return `min-${time}-${primary}`;
    } else {
        return `min-${time}-${primary}_${iteration}`;
    }
}