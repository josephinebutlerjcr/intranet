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
        const processNote = require("./processNotice");
        event.processName = "Create a Democracy Article";

        // presense check on fields - exclusive to new
        if(!inputBody.title || !inputBody.category || !inputBody.year || !inputBody.pdfDataUrl){
            event.processRemarks = `You are missing a required input.<br><br>`;
            return await processNote.execute(event,verification)
        }

        // ID generator - exclusive to new
        let acceptSlug = false; let iteration = 0; let slug = 0;
        while(acceptSlug == false){
            slug = generateSlugMinutes(getTime(), inputBody.title, inputBody.category, inputBody.year, iteration);
            try {
                await getS3Item(config.buckets.content, `democracy/${slug}.pdf`)
            } catch(err){
                // if error, it doesnt exist, so we accept the slug
                acceptSlug = true
            }
        }

        let success = [];
        let failure = [];
        let update = true;

        // title
        if(/^[A-Za-z0-9 !'£?&.,()/\-]{1,32}$/.test(inputBody.title) == false){
            failure.push("Title invalid; 1 to 32 characters, permitted: A-Z a-z 0-9 '-:,./ and spaces only.");
            update = false;
        } else {
            success.push(`Successfully set article title to "${inputBody.title}"`);
        }

        // category
        if(["jcr","welfare","other"].includes(inputBody.category) == false){
            failure.push("Category invalid; only one of the pre-set inputs allowed.");
            update = false;
        } else {
            success.push(`Successfully set category to "${inputBody.category}"`);
        }

        // year
        if(/^[0-9]{4}$/.test(inputBody.year) == false){
            failure.push("Year invalid");
            update = false;
        } else {
            success.push(`Successfully set year to "${inputBody.year}"`);
        }

        // pdf data url: copied from edit handler! - uploads too
        const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
        const s3 = new S3Client();
        try {
            inputBody.pdfDataUrl = inputBody.pdfDataUrl.replace(/ /g,"+")
            const base64 = inputBody.pdfDataUrl.replace(/^data:application\/pdf;base64,/, "");
            const buffer = Buffer.from(base64, "base64");
            if(inputBody.pdfDataUrl.includes("application/pdf" == false)){
                failure.push("Only PDFs are accepted");
                update = false;
            } else if(buffer.length > 1536*1024){
                failure.push(`Maximum 1536 KB accepted. This file is ${Math.ceil(buffer.length / 1024)} KB large (rounded up)`);
                update = false;
            } else if(update == true) {
                const command = new PutObjectCommand({
                    Bucket: config.buckets.content,
                    Key: `democracy/${slug}.pdf`,
                    Body: buffer,
                    ContentType: "application/pdf"
                })
                await s3.send(command);
                success.push("Uploaded Minutes")
            }
        } catch(err) {
            failure.push("Internal server error when uploading. Please contact the webmaster if this error persists.");
            update = false;
        }

        if(success.length != 0){
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
        event.processRemarks = `<b>Failures:</b> (no failures = nothing shows below)<br>${failure.join("<br>")}<br><br>`;
        if(update){
            event.processRemarks += `<b>Article Created</b>`;
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
function generateSlugMinutes(time, name, category, year, iteration){
    const primary = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^-+|-+$/g, "");
    if(iteration == 0){
        return `${time}-${category}-${year}-${primary}`;
    } else {
        return `${time}-${category}-${year}-${primary}_${iteration}`;
    }
}