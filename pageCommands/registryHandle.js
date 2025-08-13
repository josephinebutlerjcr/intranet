const fs = require("fs");
const config = require("../config.json")
const { getItem, putItem } = require("../auxilliaryFunctions/dynamodb")
const { uploadImageJpeg, getS3Item, putS3Item } = require("../auxilliaryFunctions/s3")
const { parseBody, getTime } = require("../auxilliaryFunctions/formatting")


// main TODO
module.exports = {
    name: "POST/account",
    description: "Individual's way to put their preferred name",
    execute: async(event, verification) => {
        const inputBody = await parseBody(event.body);

        let failure = []; let success = [];

        let nameChange = false;


        if(!!inputBody.name && inputBody.name != verification.name){
            if(/^(?=.{1,48}$)[\p{L}'-]+(?: [\p{L}'-]+)*$/u.test(inputBody.name) == false){
                failure.push("Name invalid; 1 to 48 characters, permitted: A-Z a-z (with diacritics), -' and spaces only.");
            } else {
                success.push(`Changed name from ${verification.name} to ${inputBody.name}`)
                verification.name = inputBody.name;
                nameChange = true;
            }
        } else {
            failure.push("No input name provided / input is the same as current name")
        }

        // makes update
        if(nameChange){
            // implements DB change
            await putItem(config.tables.users, verification);

            // checks exec position, if so updates bio
            if(["chair","admin","exec"].includes(verification.privilege)){
                try {
                    let biographies = await getS3Item(config.buckets.operational, `executive/biographies.json`);
                    biographies = JSON.parse(biographies);
                    if(!biographies[verification.cis]){
                        biographies[verification.cis] = {avatar:false, bio:"",name:""}
                    }
                    biographies[verification.cis].name = verification.name;
                    await putS3Item(JSON.stringify(biographies), config.buckets.operational, `executive/biographies.json`);
                    success.push("As a result, the name has been changed on exec profile.")
                } catch(err){}
            }
            
            // logbook
            let logBook = []
            try {
                logBook = await getS3Item(config.buckets.operational,`logs/person/${verification.cis}.json`)
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
                await putS3Item(JSON.stringify(logBook),config.buckets.operational, `logs/person/${verification.cis}.json`)
            } catch(err){}
        }

        // override: new user goes to dashboard
        if(inputBody.overrides == "new"){
            const dashboard = require("./dashboard");
            return await dashboard.execute(event,verification);
        }

        // sends note
        const processNote = require("./processNotice");
        event.processName = "Preferred Name Edit";
        event.processRemarks = `<b>Successes:</b><br>${success.join("<br>")} <br><br> <b>Failures:</b><br>${failure.join("<br>")}<br><br>`;
        if(nameChange){
            event.processRemarks += `<b>Changes have been made</b>`;
            event.allowBack = false;
            event.otherLink = `/account`
        } else {
            event.processRemarks += `<b>No changes have been made</b>`;
            event.allowBack = true;
        }

        return await processNote.execute(event,verification)
    }
}