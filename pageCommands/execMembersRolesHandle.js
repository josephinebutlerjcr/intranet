const config = require("../config.json")
const { getS3Item, putS3Item } = require("../auxilliaryFunctions/s3");
const {parseBody, getTime} = require("../auxilliaryFunctions/formatting")
const { getItem, putItem } = require("../auxilliaryFunctions/dynamodb")

// main
module.exports = {
    name: "POST/exec/members",
    description: "Exec People Register Handler",
    execute: async(event, verification) => {
        // user access levels
        if(["chair","admin"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        // retrieves data in system
        let ranks = {};
        try {
            ranks = await getS3Item(config.buckets.operational, `executive/roles.json`);
            ranks = JSON.parse(ranks)
        } catch(err) {
            const dashboard = require("./dashboard");
            return await dashboard.execute(event,verification)
        }

        // checks input
        const rtnPage = require("./execMembersRolesView")
        const inputBody = await parseBody(event.body);
        if(!inputBody.body){
            event.error = "No Body Provided";
            return await rtnPage.execute(event,verification)
        }

        // data points
        let inputRanks = JSON.parse(inputBody.body);
        let success = []; let failure = [];
        if(Object.keys(inputRanks).includes("main") == false){inputRanks.main = {}}
        if(Object.keys(inputRanks).includes("extra") == false){inputRanks.extra = {}}
        if(Object.keys(inputRanks).includes("emailOverrides") == false){inputRanks.emailOverrides = {}}
        let changePrivilege = {};

        const cisRegex = /^[a-z]{4}[0-9]{2}$/i;

        // considers main pool: no change in ranks
        for(let rankName of Object.keys(ranks.main)){
            if(ranks.main[rankName] != inputRanks.main[rankName]){
                if(cisRegex.test(inputRanks.main[rankName])){
                    // success: changes the privilege levels of incoming, and outgoing (to general, if they didn't take on another post)
                    if(["President","Facso","Webmaster"].includes(rankName)){
                        changePrivilege[inputRanks.main[rankName]] = "admin";  
                    } else {
                        changePrivilege[inputRanks.main[rankName]] = "chair";  
                    }
                    if(!changePrivilege[ranks.main[rankName]]){changePrivilege[ranks.main[rankName]] = "general"}
                    success.push(`Changed ${rankName} from ${ranks.main[rankName]} to ${inputRanks.main[rankName]}`);
                    ranks.main[rankName] = inputRanks.main[rankName];
                } else {
                    failure.push(`Rank ${rankName} not changed: invalid CIS input`)
                }
            }

            // considers email overrides
            if(!!ranks.emailOverrides[rankName] && !inputRanks.emailOverrides[rankName]){
                success.push(`Removed special email for ${rankName}`);
                delete ranks.emailOverrides[rankName];
            } else if(!ranks.emailOverrides[rankName] && !inputRanks.emailOverrides[rankName]){}
            else if(ranks.emailOverrides[rankName] != inputRanks.emailOverrides[rankName]) {
                success.push(`Changed special email for ${rankName} from ${ranks.emailOverrides[rankName] || "No Email"} to ${inputRanks.emailOverrides[rankName]}`);
                ranks.emailOverrides[rankName] = inputRanks.emailOverrides[rankName];
            }
        }

        // considers changes from existing extra roles
        let existingExtras = Object.keys(ranks.extra);
        let inputExtras = Object.keys(inputRanks.extra);
        for(let rankName of existingExtras){
            let rankAlive = true;

            // rank deleted
            if(inputExtras.includes(rankName) == false){
                success.push(`Removed ${rankName}`);
                if(!changePrivilege[ranks.extra[rankName]]){changePrivilege[ranks.extra[rankName]] = "general"}
                delete ranks.extra[rankName];
                rankAlive = false;
            } else {
                // new person
                if(ranks.extra[rankName] != inputRanks.extra[rankName]){
                    if(cisRegex.test(inputRanks.extra[rankName]) == true){
                        // success: privilege change request and changes implemented
                        success.push(`Changed ${rankName} from ${ranks.extra[rankName]} to ${inputRanks.extra[rankName]}`)
                        if(!changePrivilege[ranks.extra[rankName]]){changePrivilege[ranks.extra[rankName]] = "general"}
                        changePrivilege[inputRanks.extra[rankName]] = "exec";
                        ranks.extra[rankName] = inputRanks.extra[rankName];
                    } else {
                        // failure
                        failure.push(`Rank ${rankName} not changed: invalid CIS input`)
                    }
                }
            }

            // considers email changes
            if(rankAlive){
                if(!!ranks.emailOverrides[rankName] && !inputRanks.emailOverrides[rankName]){
                    success.push(`Removed special email for ${rankName}`);
                    delete ranks.emailOverrides[rankName];
                } else if(!ranks.emailOverrides[rankName] && !inputRanks.emailOverrides[rankName]){}
                else if(ranks.emailOverrides[rankName] != inputRanks.emailOverrides[rankName]) {
                    success.push(`Changed special email for ${rankName} from ${ranks.emailOverrides[rankName] || "No Email"} to ${inputRanks.emailOverrides[rankName]}`);
                    ranks.emailOverrides[rankName] = inputRanks.emailOverrides[rankName];
                }
            }
        }

        // checks all ranks; adds new ones
        for(let rankName of inputExtras){
            if(existingExtras.includes(rankName)){
                continue;
            } else {
                // new rank
                if(Object.keys(ranks.main).includes(rankName)){
                    failure.push(`Attempted to add ${rankName} as an additional rank, but it already exists as a primary rank`)
                } else if(/^[A-Za-z][A-Za-z\s'\-]{1,48}[A-Za-z0-9]$/.test(rankName) == false) {
                    failure.push(`Attempted to add ${rankName} as an additional rank, but not allowed, as it must start with a letter, end with a letter or number, and within it may only include letters, numbers, spaces, hyphens, and apostrophes. Maximum 50 characters.`)
                } else if(cisRegex.test(inputRanks.extra[rankName]) == false) {
                    failure.push(`Attempted to add ${rankName} as an additional rank, but not allowed, as the CIS code you tried to associate it with is invalid`)
                } else {
                    // allowed
                    success.push(`Added ${rankName} as a new extra role, office holder: ${inputRanks.extra[rankName]}`);
                    ranks.extra[rankName] = inputRanks.extra[rankName];
                    changePrivilege[inputRanks.extra[rankName]] = "exec";

                    // considers email
                    if(!!inputRanks.emailOverrides[rankName]){
                        success.push(`Added special email for ${rankName} as ${inputRanks.emailOverrides[rankName]}`);
                        ranks.emailOverrides[rankName] = inputRanks.emailOverrides[rankName];
                    }
                }
            }
        }

        // shifts around user privileges, gets preferred names
        const entries = await Promise.all(
            Object.entries(changePrivilege).map(async ([cis, role]) => {
                const name = await changeRole(cis, role);
                return [cis, name];
            })
        );
        const resultNames = Object.fromEntries(entries);

        // rank implementation
        try {
            await putS3Item(JSON.stringify(ranks), config.buckets.operational, `executive/roles.json`)
        } catch(err){}

        // logbook
        let logBook = []
        try {
            logBook = await getS3Item(config.buckets.operational,`logs/groups/0-exec.json`)
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
            await putS3Item(JSON.stringify(logBook),config.buckets.operational, `logs/groups/0-exec.json`)
        } catch(err){}

        // biographies: additions
        try {
            let biographies = await getS3Item(config.buckets.operational, `executive/biographies.json`);
            biographies = JSON.parse(biographies);
            // cross checks mains
            for(let rank of Object.keys(ranks.main)){
                let cis = ranks.main[rank];
                if(!biographies[cis]){
                    biographies[cis] = {
                        avatar: false,
                        bio: "",
                        name: resultNames[cis] || ""
                    }
                }
            }
            for(let rank of Object.keys(ranks.extra)){
                let cis = ranks.extra[rank];
                if(!!cis){
                    if(!biographies[cis]){
                        biographies[cis] = {
                            avatar: false,
                            bio: "",
                            name: resultNames[cis] || ""
                        }
                    }
                }
            }
            await putS3Item(JSON.stringify(biographies),config.buckets.operational, `executive/biographies.json`)
        } catch(err) {}

        // todo: biography removals

        // final passback
        const processNote = require("./processNotice");
        event.processName = "Edit the Executive";
        event.processRemarks = `<b>Successes:</b><br>${success.join("<br>")} <br><br> <b>Failures:</b><br>${failure.join("<br>")}<br><br>`;
        event.processRemarks += `<b>Changes have been made</b>`;
        event.otherLink = `/exec/members`
        return await processNote.execute(event,verification)
    }
}

// role changer
async function changeRole(cis, role){
    if(!!cis){
        let user = await getItem(config.tables.users, {cis: cis});
        if(user.error){
            user = {
                cis: cis,
                generated: getTime(),
                name: "",
                token: {
                    key: "",
                    exp: -1
                },
                login:{
                    code: "",
                    generated: -1,
                    attempts: 0,
                    attemptsOnCode: 0
                },
                privilege: "general",
                membership: "N/R",
                newUser: true
            }
        }

        user.privilege = role;

        await putItem(config.tables.users, user);

        return user.name;
    }
}