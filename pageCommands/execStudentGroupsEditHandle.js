const fs = require("fs");
const config = require("../config.json")
const { getItem, putItem, deleteItem } = require("../auxilliaryFunctions/dynamodb")
const { uploadImageJpeg, getS3Item, putS3Item } = require("../auxilliaryFunctions/s3")
const { parseBody, getTime } = require("../auxilliaryFunctions/formatting")


// main
module.exports = {
    name: "POST/exec/groups/edit",
    description: "Exec's Student Groups Edit Portal HANDLER",
    execute: async(event, verification) => {

        // body
        const inputBody = await parseBody(event.body);
        const viewPage = require("./execStudentGroupsEditView");

        // validate an id exists
        if(!inputBody.id){
            const directoryPage = require("./execStudentGroups");
            return await directoryPage.execute(event,verification);
        }
        event.id = inputBody.id;

        // finds current society details
        let society = await getItem(config.tables.groups, {id: inputBody.id});
        if(society.error || society.id != inputBody.id){
            event.error = "Society does not exist"
            return await viewPage.execute(event, verification);
        }

        // user access levels
        const societyPeople = Object.values(society.admins).flat();
        let editPrivilege = "full"
        if(["chair","admin","exec"].includes(verification.privilege) == false){
            if(societyPeople.includes(verification.cis)){
                editPrivilege = "limit"
            } else {
                const forbiddenPage = require("./error403");
                return await forbiddenPage.execute(event,verification)
            }
        }

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
            if(/^[A-Za-z0-9 !'£?&.,()\-\n\/@]{1,1024}$/.test(inputBody.description) == false){
                failure.push("Society description invalid; 1 to 1024 characters, permitted: A-Z a-z 0-9 ()!'£?&.,-/@ and spaces / new lines only.");
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
                    success.push("Updated Avatar - if this is an update and not a new avatar, it may take up to 24 hours to see changes due to browser cacheing")
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
        if(!!inputBody.instagram && society.socials.instagram != inputBody.instagram){
            if(/^[\w](?!.*?\.{2})[\w.]{1,28}[\w]$/.test(inputBody.instagram) == false){
                failure.push("Invalid instagram handle given");
                update = false;
            } else {
                success.push(`Successfully changed Instagram Handle from "${society.socials.instagram}" to "${inputBody.instagram}"`);
                society.socials.instagram = inputBody.instagram;
            }
        }
        if(!!inputBody.whatsapp && society.socials.whatsapp != inputBody.whatsapp.replace(/https:\/\/chat\.whatsapp\.com\//g, "")){
            let whatsappCode = inputBody.whatsapp.replace(/https:\/\/chat\.whatsapp\.com\//g, "");
            if(/^[a-zA-Z0-9]{22}$/g.test(whatsappCode) == false){
                failure.push("Invalid WhatsApp chat link given");
                update = false;
            } else {
                success.push(`Successfully changed WhatsApp Chat Link from "https://chat.whatsapp.com/${society.socials.whatsapp}" to "https://chat.whatsapp.com/${inputBody.whatsapp}"`);
                society.socials.whatsapp = inputBody.whatsapp;
            }
        }

        // awards NOT AVAILABLE IN NEW - ONLY FOR FULL PRIVELEGE
        if(editPrivilege == "full"){
            if(!!inputBody.awards && inputBody.awards != society.awards.join("\n")){
                let awards = inputBody.awards.split("\n");
                let awardsFailed = false;
                for(let award of awards){
                    if(/^[A-Za-z0-9 !'£?&.,()\-]{1,32}$/.test(award) == false){
                        awardsFailed = true;
                    }
                }

                if(awardsFailed){
                    failure.push("Society awards invalid; 1 to 32 characters per line, permitted: A-Z a-z 0-9 ()!'£?&.,- and spaces only.");
                    update = false;
                } else if(awards.length > 10){
                    failure.push("Society awards invalid; Maximum 10 awards allowed.");
                    update = false;
                } else {
                    success.push("Amended society's awards");
                    society.awards = awards;
                }
            }
        }

        // deletion - ONLY FOR FULL PRIVELEGE
        let deleteSoc = false;
        if(editPrivilege == "full"){
            if(!!inputBody.delete && inputBody.delete.trim() == society.id){
                deleteSoc = true;
                success = ["Deleted Society"];
                failure = [];
            }
        }

        // makes updates
        if(success.length == 0){update = false;}
        if(deleteSoc){
            await deleteItem(config.tables.groups, {id: society.id});
        } else if(update){
            await putItem(config.tables.groups, society);
        }

        // logbook
        if(deleteSoc || update){
            let logBook = []
            try {
                logBook = await getS3Item(config.buckets.operational,`logs/groups/${society.id}.json`)
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
                await putS3Item(JSON.stringify(logBook),config.buckets.operational, `logs/groups/${society.id}.json`)
            } catch(err){}
        }

        // sends note
        const processNote = require("./processNotice");
        event.processName = "Edit a Student Group";
        event.processRemarks = `<b>Successes:</b><br>${success.join("<br>")} <br><br> <b>Failures:</b><br>${failure.join("<br>")}<br><br>`;
        if(update || deleteSoc){
            event.processRemarks += `<b>Changes have been made</b>`;
            event.allowBack = false;
            event.otherLink = `/exec/groups?id=${society.id}`
            if(deleteSoc){
                event.otherLink = `/exec/groups`
            } else if(editPrivilege == "limit"){
                event.otherLink = `/groups?id=${society.id}`
            }
        } else {
            event.processRemarks += `<b>No changes have been made</b>`;
            event.allowBack = true;
        }
        return await processNote.execute(event,verification)
    }
}