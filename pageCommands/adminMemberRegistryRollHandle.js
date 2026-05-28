const config = require("../config.json")
const { getS3Item, putS3Item, listDirectoryFiles, deleteS3Item } = require("../auxilliaryFunctions/s3")
const { parseBody, getTime } = require("../auxilliaryFunctions/formatting")

// main
module.exports = {
    name: "POST/admin/registry/roll",
    description: "Update the registry roll HANDLER",
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
        if(!inputBody.roll || !inputBody.declaration){
            event.processRemarks = `You are missing a required input.<br><br>`;
            return await processNote.execute(event,verification)
        }

        let failure = [];
        let update = true;

        // declaration
        if(inputBody.declaration != "yes"){
            failure.push("You have failed to declare that you know what you are doing.");
            update = false;
        }

        // body validator
        let rollFailure = false;
        let rollIndiv = inputBody.roll.split("\n");
        let rollLength = rollIndiv.length;
        let count = 0;
        while(rollFailure == false && count < rollLength){
            let inspectRow = rollIndiv[count];
            if(/^Hash:\s[a-f0-9]{64},Salt:\s[a-f0-9]{32}$/.test(inspectRow) == false){
                failure.push(`At least one row has failed the check. The row number of the first failure occured on row: ${count+1}`);
                update = false;
                rollFailure = true;
            }
            count += 1;
        }

        // attempts to change the roll
        if(update == true){
            try {
                await putS3Item(inputBody.roll,config.buckets.operational, config.operationalLocations.collegeMembersHashedCisCodes)
            } catch(err){
                update = false;
                failure.push("Not your fault, but ours. We could not successfully replace the roll. Please try again later.")
            }
        }

        if(update == true){
            // logbook changes

            // gets any old log book for this policy number
            let logBook = []
            try {
                logBook = await getS3Item(config.buckets.operational, `logs/operational/studentRoll.json`)
                logBook = JSON.parse(logBook)
            } catch(err) {}

            if(!logBook){
                logBook = []
            }

            // pushes notes
            logBook.push({
                time: getTime(),
                person: verification.cis,
                notes:[`Roll replaced.`]
            })
            
            // uploads log
            try {
                await putS3Item(JSON.stringify(logBook),config.buckets.operational, `logs/operational/studentRoll.json`)
            } catch(err){}
        }

        // sends note
        event.processRemarks = `<b>Failures:</b> (no failures = nothing shows below)<br>${failure.join("<br>")}<br><br>`;
        if(update){
            event.processRemarks += `<b>Roll Replaced</b>`;
            event.allowBack = false;
            event.otherLink = `/exec`
        } else {
            event.processRemarks += `<b>The roll could not have been replaced due to the failures.</b>`;
            event.allowBack = true;
        }
        return await processNote.execute(event,verification)
    }
}