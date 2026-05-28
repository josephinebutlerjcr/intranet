const fs = require("fs");
const config = require("../config.json")
const { getItem, putItem } = require("../auxilliaryFunctions/dynamodb")
const { uploadImageJpeg, getS3Item, putS3Item } = require("../auxilliaryFunctions/s3")
const { parseBody, getTime } = require("../auxilliaryFunctions/formatting")

// editable pages. IF YOU WANT TO ADD NEW PAGES, YOU MUST IMPLEMENT IT ON THE PUBLIC WEBSITE AS WELL AS ADDING IT BELOW:
const pages = ["welfare","freshers","college","contact","events","stash","acknowledgements"]
// YOU MUST ALSO UPDATE THIS IN THE execPagesView.js FILE TOO!

// main TODO
module.exports = {
    name: "POST/exec/pages",
    description: "Exec's Page Editor Handler",
    execute: async(event, verification) => {
        const inputBody = await parseBody(event.body);

        // user access levels
        if(["chair","admin","exec"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }       

        // now goes through each item
        let success = [];
        let failure = [];
        let update = true;

        // declarations
        if(inputBody.declaration != "yes"){
            failure.push("Failed to declare.");
            update = false;
        } else {
            success.push(`Declaration Recieved. "I, ${verification.cis}, can declare that I am authorised to edit this page by my exec responsibility, or by the exec mandate, and can confirm that the information I am providing is truly accurate, does not breach any laws, does not breach any JCR policies, or cause offense to members of the public. I understand that the changes are logged against my username."`)
        }

        // valid pages
        if(pages.includes(inputBody.page) == false){
            failure.push("Invalid Page");
            update = false;
        } else {
            success.push(`Changes made against page: ${inputBody.page}`)
        }

        // editor part
        if(/^[\s\S]{1,40000}$/.test(inputBody.editor) == false){
            failure.push("File invalid. Please go back in your browser. You may need to contact a webmaster (unless the problem is your stuff is more than 40,000 characters).");
            update = false;
        } else {
            success.push(`Successfully changed contents of the webpage to: "${inputBody.editor}"`);
        }

        // if valid, attempts to put into the s3:
        if(update){
            try {
                await putS3Item(inputBody.editor, config.buckets.operational, `pages/${inputBody.page}.md`)
            } catch(err) {
                update = false;
                success = [];
                failure = ["We experienced an error. Please GO BACK in your browser so you don't lose changes, and try again later. You may need to contact a webmaster otherwise"]
            }
        }
        
        // logs updates
        if(update){
            // logbook changes
            let logBook = []
            try {
                logBook = await getS3Item(config.buckets.operational,`logs/operational/page-${inputBody.page}.json`)
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
                await putS3Item(JSON.stringify(logBook),config.buckets.operational, `logs/operational/page-${inputBody.page}.json`)
            } catch(err){}
        }

        // sends note
        const processNote = require("./processNotice");
        event.processName = "Edit a Page";
        event.processRemarks = `<b>Successes:</b><br>${success.join("<br>")} <br><br> <b>Failures:</b><br>${failure.join("<br>")}<br><br>`;
        if(update){
            event.processRemarks += `<b>Changes have been made</b>`;
            event.allowBack = false;
            event.otherLink = `/exec/pages`
        } else {
            event.processRemarks += `<b>NO CHANGES HAVE BEEN MADE</b>`;
            event.allowBack = true;
        }
        return await processNote.execute(event,verification)
    }
}