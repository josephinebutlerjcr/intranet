const fs = require("fs");
const config = require("../config.json")
const { getItem, putItem } = require("../auxilliaryFunctions/dynamodb")
const { uploadImageJpeg, getS3Item, putS3Item } = require("../auxilliaryFunctions/s3")
const { parseBody, getTime } = require("../auxilliaryFunctions/formatting")


// main TODO
module.exports = {
    name: "POST/exec/me",
    description: "Exec's Self-Service Handler",
    execute: async(event, verification) => {
        const inputBody = await parseBody(event.body);

        // checks ranks and permissions
        let biographies = {}; let ranks = {};
        try {
            biographies = await getS3Item(config.buckets.operational, `executive/biographies.json`);
            biographies = JSON.parse(biographies)
            ranks = await getS3Item(config.buckets.operational, `executive/roles.json`);
            ranks = JSON.parse(ranks)
        } catch(err) {
            const dashboard = require("./dashboard");
            return await dashboard.execute(event,verification)
        }

        // considers which CIS to use
        let cisToUse = verification.cis;
        if(verification.privilege == "admin" && !!inputBody.cis && /^[a-z]{4}[0-9]{2}$/.test(inputBody.cis)){
            cisToUse = inputBody.cis
        }

        // allow edit?
        let edit = true;
        /*if(ranks.webBioPermit.includes(cisToUse) == false){
            edit = false;
        }*/ // removed this logic - literally only applies to webmaster

        if(edit == false){
            const dashboard = require("./dashboard");
            return await dashboard.execute(event,verification)
        }

        // retrieves individual file
        let myFile = biographies[cisToUse] || {bio:"",avatar:""};

        // now goes through each item
        let success = [];
        let failure = [];
        let update = true; // turns false for non-condoned errors. condoned errors, e.g. avatar, will simply not get changed.

        // description (bio)
        if(!!inputBody.description && inputBody.description != myFile.bio){
            if(/^[A-Za-z0-9 !'£?&.,()\-\n\/@:[\]]{1,2048}$/.test(inputBody.description) == false){
                failure.push("Bio invalid; 1 to 2048 characters, permitted: A-Z a-z 0-9 ()!'£?&.,-/@:[] and spaces / new lines only.");
                update = false;
            } else {
                success.push(`Successfully changed bio from "${myFile.bio}" to "${inputBody.description}"`);
                myFile.bio = inputBody.description;
            }
        }

        // avatar
        if(!!inputBody.avatar){
            inputBody.avatar = inputBody.avatar.replace(/ /g,"+");
            if(/data:image\/jpeg(?:;charset=[-\w]+)?;base64,[A-Za-z0-9+\/]+={0,2}$/.test(inputBody.avatar) == false){
                failure.push("Could not update avatar: invalid input");
            } else {
                const base64String = inputBody.avatar.split(',')[1];
                if(base64String.length * 0.75 >= 250*1024){
                    failure.push("Could not update avatar: size above 250 KB");
                } else {
                    success.push("Updated Avatar")
                    myFile.avatar = true;
                    await uploadImageJpeg(config.buckets.content, `avatars/${cisToUse}.jpg`, base64String);
                }
            }
        }

        // makes updates
        if(success.length == 0){update = false;}
        if(update){
            // updates bio files
            biographies = await getS3Item(config.buckets.operational, `executive/biographies.json`);
            biographies = JSON.parse(biographies)
            biographies[cisToUse] = myFile;
            await putS3Item(JSON.stringify(biographies), config.buckets.operational, `executive/biographies.json`)

            // logbook changes
            let logBook = []
            try {
                logBook = await getS3Item(config.buckets.operational,`logs/exec/${cisToUse}.json`)
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
                await putS3Item(JSON.stringify(logBook),config.buckets.operational, `logs/exec/${cisToUse}.json`)
            } catch(err){}
        }

        // sends note
        const processNote = require("./processNotice");
        event.processName = "Edit a Person";
        event.processRemarks = `<b>Successes:</b><br>${success.join("<br>")} <br><br> <b>Failures:</b><br>${failure.join("<br>")}<br><br>`;
        if(update){
            event.processRemarks += `<b>Changes have been made</b>`;
            event.allowBack = false;
            event.otherLink = `/exec/me`
            if(verification.cis != cisToUse){
                event.otherLink = `/exec/me?id=${cisToUse}`
            }
        } else {
            event.processRemarks += `<b>NO CHANGES HAVE BEEN MADE</b>`;
            event.allowBack = true;
        }
        return await processNote.execute(event,verification)
    }
}