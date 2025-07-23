const fs = require("fs");
const config = require("../config.json")
const { getItem, putItem } = require("../auxilliaryFunctions/dynamodb")
const { uploadImageJpeg, getS3Item, putS3Item } = require("../auxilliaryFunctions/s3")
const { parseBody, getTime } = require("../auxilliaryFunctions/formatting")

/*
WARNING:

This version is just the edit version, except we cut out events and awards, pre-existing checks, but include an ID allocation.

The code will also change comparison tests to proper presense checks.

I have added in a line for presense checks of *required* fields.

If you change edit code, please make sure to copy changes here directly.
*/

// main
module.exports = {
    name: "POST/exec/groups/new",
    description: "Exec's Student Groups Creation Portal HANDLER",
    execute: async(event, verification) => {
        // user access levels
        if(["chair","admin","exec"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        // body
        const inputBody = await parseBody(event.body);
        const viewPage = require("./execStudentGroupsNewView"); // changed from edit

        // constructs a (blank) society - exclusive to new
        let society = {
            id: "",
            category:"",
            name:"",
            events:[],
            description:"",
            awards:[],
            admins:{
                "president":[]
            },
            socials:{},
            avatar: false
        }

        // presense check on fields - exclusive to new
        if(!inputBody.name || !inputBody.description || !inputBody.category || !inputBody.president){
            event.error = "You are missing the mandatory fields: name, description, category, president";
            return await viewPage.execute(event,verification);
        }

        // ID generator - exclusive to new
        let acceptSlug = false; let iteration = 0;
        while(acceptSlug == false){
            society.id = generateSlug(inputBody.category, inputBody.name, iteration);
            let check = await getItem(config.tables.groups, {id: society.id});
            if(check.error || check.id != society.id){acceptSlug = true}
        }

        /* COPIED FROM EDITING WITH SOME REMOVALS FROM THIS POINT */

        // now goes through each item
        let success = [];
        let failure = [];
        let update = true; // turns false for non-condoned errors. condoned errors, e.g. avatar, will simply not get changed.

        // soc name
        if(!!inputBody.name && inputBody.name != society.name){
            if(/^[A-Za-z0-9 !'£?&.,()\-]{1,32}$/.test(inputBody.name) == false){
                failure.push("Society name invalid; 1 to 32 characters, permitted: A-Z a-z 0-9 ()!'£?&.,- and spaces only.");
                update = false;
            } else {
                success.push(`Successfully changed society name from "${society.name}" to "${inputBody.name}"`);
                society.name = inputBody.name;
            }
        }

        // description
        if(!!inputBody.description && inputBody.description != society.description){
            if(/^[A-Za-z0-9 !'£?&.,\-\n]{1,1024}$/.test(inputBody.description) == false){
                failure.push("Society description invalid; 1 to 1024 characters, permitted: A-Z a-z 0-9 ()!'£?&.,- and spaces / new lines only.");
                update = false;
            } else {
                success.push(`Successfully changed society description from "${society.description}" to "${inputBody.description}"`);
                society.description = inputBody.description;
            }
        }

        // category
        if(!!inputBody.category && inputBody.category != society.category){
            if(["society","sport","committee"].includes(inputBody.category) == false){
                failure.push("Society category invalid; only permitted: society, sport, committee");
                update = false;
            } else {
                success.push(`Successfully changed society category from "${society.category}" to "${inputBody.category}"`);
                society.category = inputBody.category;
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
                    society.avatar = true;
                    await uploadImageJpeg(config.buckets.content, `societylogo/${society.id}.jpg`, base64String);
                }
            }
        }

        // people: president
        if(!!inputBody.president && inputBody.president != society.admins.president.join(",")){
            let tmpPresidents = inputBody.president.split(",");
            let allowPresident = true;
            if(/^[a-zA-Z]{4}\d{2}$/.test(tmpPresidents[0]) == false || tmpPresidents[0] == "abcd12"){
                failure.push("President invalid; invalid CIS code for first person");
                update = false;
                allowPresident = false;
            }
            if(!!tmpPresidents[1]){
                if(/^[a-zA-Z]{4}\d{2}$/.test(tmpPresidents[1]) == false || tmpPresidents[1] == "abcd12"){
                    failure.push("President invalid; invalid CIS code for second person - they have been removed otherwise");
                    tmpPresidents = [tmpPresidents[0]];
                }
            }
            if(allowPresident){
                success.push(`Changed president(s) from ${society.admins.president.join(",")} to ${tmpPresidents.join(",")}`)
                society.admins.president = tmpPresidents;
            }
        }

        // people: vicepresident, treasurer, socialsec
        let joinedVp = ""; if(!!society.admins.vicepresident){joinedVp = society.admins.vicepresident.join(",")}
        let joinedTr = ""; if(!!society.admins.treasurer){joinedTr = society.admins.treasurer.join(",")}
        let joinedSS = ""; if(!!society.admins.socialsec){joinedSS = society.admins.socialsec.join(",")}

        if(!!inputBody.vicepresident && inputBody.vicepresident != joinedVp){
            let tmp = inputBody.vicepresident.split(",");
            let allow = true;
            if(/^[a-zA-Z]{4}\d{2}$/.test(tmp[0]) == false){
                failure.push("Vice President invalid; invalid CIS code for first person");
                update = false;
                allow = false;
            } else if(tmp[0] == "abcd12") {
                success.push("Removed vice president(s)");
                tmp = [];
            } else if(!!tmp[1]){
                if(/^[a-zA-Z]{4}\d{2}$/.test(tmp[1]) == false || tmp[1] == "abcd12"){
                    failure.push("Vice president invalid; invalid CIS code for second person - they have been removed otherwise");
                    tmp = [tmp[0]];
                }
            }
            if(allow){
                success.push(`Changed VP(s) from ${joinedVp} to ${tmp.join(",") || ""}`)
                society.admins.vicepresident = tmp;
            }
        }
        if(!!inputBody.treasurer && inputBody.treasurer != joinedTr){
            let tmp = inputBody.treasurer.split(",");
            let allow = true;
            if(/^[a-zA-Z]{4}\d{2}$/.test(tmp[0]) == false){
                failure.push("Treasurer invalid; invalid CIS code for first person");
                update = false;
                allow = false;
            } else if(tmp[0] == "abcd12") {
                success.push("Removed treasurer(s)");
                tmp = [];
            } else if(!!tmp[1]){
                if(/^[a-zA-Z]{4}\d{2}$/.test(tmp[1]) == false || tmp[1] == "abcd12"){
                    failure.push("Treasurer invalid; invalid CIS code for second person - they have been removed otherwise");
                    tmp = [tmp[0]];
                }
            }
            if(allow){
                success.push(`Changed treasurer(s) from ${joinedTr} to ${tmp.join(",") || ""}`)
                society.admins.treasurer = tmp;
            }
        }
        if(!!inputBody.socialsec && inputBody.socialsec != joinedSS){
            let tmp = inputBody.socialsec.split(",");
            let allow = true;
            if(/^[a-zA-Z]{4}\d{2}$/.test(tmp[0]) == false){
                failure.push("Social secretary invalid; invalid CIS code for first person");
                update = false;
                allow = false;
            } else if(tmp[0] == "abcd12") {
                success.push("Removed social secretar(y/ies)");
                tmp = [];
            } else if(!!tmp[1]){
                if(/^[a-zA-Z]{4}\d{2}$/.test(tmp[1]) == false || tmp[1] == "abcd12"){
                    failure.push("Social secretary invalid; invalid CIS code for second person - they have been removed otherwise");
                    tmp = [tmp[0]];
                }
            }
            if(allow){
                success.push(`Changed social sec(s) from ${joinedSS} to ${tmp.join(",") || ""}`)
                society.admins.socialsec = tmp;
            }
        }

        // social medias
        if(!society.socials){society.socials = {}};
        if(!!inputBody.instagram && !!society.socials.instagram && society.socials.instagram != inputBody.instagram){
            if(/^[\w](?!.*?\.{2})[\w.]{1,28}[\w]$/.test(inputBody.instagram) == false){
                failure.push("Invalid instagram handle given");
                update = false;
            } else {
                success.push(`Successfully changed Instagram Handle from "${society.socials.instagram}" to "${inputBody.instagram}"`);
                society.socials.instagram = inputBody.instagram;
            }
        }
        if(!!inputBody.whatsapp && !!society.socials.whatsapp && society.socials.whatsapp != inputBody.whatsapp.replace(/https:\/\/chat\.whatsapp\.com\//g, "")){
            let whatsappCode = inputBody.whatsapp.replace(/https:\/\/chat\.whatsapp\.com\//g, "");
            if(/^[a-zA-Z0-9]{22}$/g.test(whatsappCode) == false){
                failure.push("Invalid WhatsApp chat link given");
                update = false;
            } else {
                success.push(`Successfully changed WhatsApp Chat Link from "https://chat.whatsapp.com/${society.socials.whatsapp}" to "https://chat.whatsapp.com/${inputBody.whatsapp}"`);
                society.socials.whatsapp = inputBody.whatsapp;
            }
        }

        // makes updates
        if(success.length == 0){update = false;}
        if(update){
            await putItem(config.tables.groups, society);

            // logbook changes
            let logBook = []
            try {
                logBook = await getS3Item(config.buckets.operational,`logs/groups/${society.id}.json`)
                logBook = JSON.parse(logBook);
            } catch(err){}
            logBook.push({
                time: getTime(),
                person: verification.cis,
                notes:success
            })
            try {
                await putS3Item(JSON.stringify(logBook),config.buckets.operational, `logs/groups/${society.id}.json`)
            } catch(err){}
        }

        /* THIS FOLLOWING BIT HAS A CHANGE IN WORDING AND LINKS FROM ORIGINAL */

        // sends note
        const processNote = require("./processNotice");
        event.processName = "Create a Student Group";
        event.processRemarks = `<b>Failures:</b> (no failures = nothing shows below)<br>${failure.join("<br>")}<br><br>`;
        if(update){
            event.processRemarks += `<b>STUDENT GROUP HAS BEEN CREATED</b>`;
            event.allowBack = false;
            event.otherLink = `/exec/groups?id=${society.id}`
        } else {
            event.processRemarks += `<b>The group could not have been created due to the failures.</b>`;
            event.allowBack = true;
        }
        return await processNote.execute(event,verification)
    }
}

// slug generator
function generateSlug(type, name, iteration){
    const prefix = type.toLowerCase().slice(0, 3);
    const primary = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    if(iteration == 0){
        return `${prefix}-${primary}`;
    } else {
        return `${prefix}-${primary}-${iteration}`;
    }
}