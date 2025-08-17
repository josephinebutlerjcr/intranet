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

        // checks the file existance
        const democracyPage = require("./democracyView")
        if(!inputBody.article){
            return await democracyPage.execute(event,verification);
        }
        try {
            let file = await getS3Item(config.buckets.content, `democracy/${inputBody.article}.pdf`);
        } catch(err) {
            return await democracyPage.execute(event,verification);
        }

        // now goes through each item
        let success = [];
        let failure = [];

        let slug = inputBody.article; let update = true;

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

        // makes updates
        if(success.length != 0){

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
            event.processRemarks += `<b>Changes have been made</b> - please note when you return, you may see the old version due to caching. Please clear your browser cache for this website to see the new version immediately.`;
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