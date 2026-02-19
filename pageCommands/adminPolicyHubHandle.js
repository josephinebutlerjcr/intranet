const config = require("../config.json")
const { getS3Item, putS3Item, listDirectoryFiles, deleteS3Item } = require("../auxilliaryFunctions/s3")
const { parseBody, getTime } = require("../auxilliaryFunctions/formatting")
const iconv = require("iconv-lite");

// main
module.exports = {
    name: "POST/admin/policy",
    description: "Create a new policy HANDLER",
    execute: async(event, verification) => {
        // user access levels
        if(["admin"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        // body
        const inputBody = await parseBody(event.body);
        const processNote = require("./processNotice");
        event.processName = "Upload a Policy Document";

        // presense check on fields
        if(!inputBody.number || !inputBody.name || !inputBody.lapse || !inputBody.pdfDataUrl){
            event.processRemarks = `You are missing a required input.<br><br>`;
            return await processNote.execute(event,verification)
        }


        let success = [];
        let failure = [];
        let update = true;

        // title
        if(/^[A-Za-z0-9 !'£?&.,()/\-]{1,64}$/.test(inputBody.name) == false){
            failure.push("Title invalid; 1 to 64 characters, permitted: A-Z a-z 0-9 '-:,./() and spaces only.");
            update = false;
        } else {
            success.push(`Successfully set article title to "${inputBody.name}"`);
        }

        // lapse
        if(/^[A-Za-z0-9 ()/\-]{1,32}$/.test(inputBody.lapse) == false){
            failure.push("Lapse month invalid; 1 to 32 characters, permitted: A-Z a-z 0-9 and spaces only.");
            update = false;
        } else {
            success.push(`Successfully set article lapse to "${inputBody.lapse}"`);
        }

        // number
        if(/^[0-9]{1,3}$/.test(inputBody.number) == false){
            failure.push("Policy number invalid");
            update = false;
        } else {
            inputBody.number = parseInt(inputBody.number)
            success.push(`Successfully set policy number to "${inputBody.number}"`);
        }

        // ID generator
        let slug = generateSlugPolicy(inputBody.number, inputBody.name, inputBody.lapse)

        // checks for any policies to discard
        let policies = await listDirectoryFiles(config.buckets.content, `policy/`);
        let replacement = false;
        let oldSlug = "";
        for(let article of policies){
            let slugSplit = article.split("-")
            if(parseInt(slugSplit[0]) == inputBody.number){
                replacement = true;
                oldSlug = article;
            }
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
                    Key: `policy/${slug}.pdf`,
                    Body: buffer,
                    ContentType: "application/pdf"
                })
                await s3.send(command);
                success.push("Uploaded Policy")
            }
        } catch(err) {
            failure.push("Internal server error when uploading. Please contact the webmaster (<a href=\"mailto:butlerwebmaster@durham.ac.uk\">butlerwebmaster@durham.ac.uk</a>) if this error persists.");
            update = false;
        }

        if(success.length != 0){
            // logbook changes

            // gets any old log book for this policy number
            let logBook = []
            try {
                logBook = await getS3Item(config.buckets.operational, `logs/policy/${inputBody.number}.json`)
                logBook = JSON.parse(logBook)
            } catch(err) {}

            if(!logBook){
                logBook = []
            }

            // remarks if a replacement is made
            if(replacement == true){
                logBook.push({
                    time: getTime(),
                    person: verification.cis,
                    notes:[`**POLICY HAS BEEN REPLACED**`,`Old Filename: ${oldSlug}.pdf`]
                })
            }

            // pushes notes
            logBook.push({
                time: getTime(),
                person: verification.cis,
                notes:success
            })
            
            // uploads log
            try {
                await putS3Item(JSON.stringify(logBook),config.buckets.operational, `logs/policy/${inputBody.number}.json`)
            } catch(err){}

            // deletes the old file
            if(replacement == true){
                await deleteS3Item(config.buckets.content, `policy/${oldSlug}.pdf`)
            }
        }

        // sends note
        event.processRemarks = `<b>Failures:</b> (no failures = nothing shows below)<br>${failure.join("<br>")}<br><br>`;
        if(update){
            event.processRemarks += `<b>Article Created</b><p>The button below will redirect you back to the exec-admin portal. If you want to see the policy on the main website, it is available at <a href="https://www.butlerjcr.com/policy">https://www.butlerjcr.com/policy</a></p>`;
            event.allowBack = false;
            event.otherLink = `/exec`
        } else {
            event.processRemarks += `<b>The document could not have been created due to the failures.</b>`;
            event.allowBack = true;
        }
        return await processNote.execute(event,verification)
    }
}

// slug generator
function generateSlugPolicy(number, name, lapse){
    const primary = name
        .trim()
        .replace(/[^A-Za-z0-9]+/g, "_")
        .replace(/^-+|-+$/g, "");
    const lapseNew = lapse
        .trim()
        .replace(/[^A-Za-z0-9]+/g, "_")
        .replace(/^-+|-+$/g, "");
    const numberNew = parseInt(number)
    return `${numberNew}-${primary}-${lapseNew}`;
}