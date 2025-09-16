const config = require("../config.json")
const { sendEmail } = require("../auxilliaryFunctions/email")
const { scanItems } = require("../auxilliaryFunctions/dynamodb")
const { getS3Item, putS3Item } = require("../auxilliaryFunctions/s3")
const { parseBody, getTime } = require("../auxilliaryFunctions/formatting")

// main TODO
module.exports = {
    name: "POST/admin/emailer",
    description: "Admin's way to email pre-set letter.",
    execute: async(event, verification) => {
        // accesss
        if(verification.privilege != "admin"){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        const inputBody = await parseBody(event.body);

        let presidentOfSocieties = await pollPresidents();
        let exec = await execRoles();
        let mergedResponsibilities = mergeResp(presidentOfSocieties, exec)

        // finds webmaster email
        /*let webmasterCis = "Sorry, Not Available";
        for(let person of Object.keys(exec)){
            if(exec[person] == "Webmaster"){
                webmasterCis = `${person}@durham.ac.uk`
            }
        }*/
       let webmasterCis = "butlerwebmaster@durham.ac.uk"

        // finds who to send to
        let sendList = {};
        let sentTo = [];
        let rejects = [];
        if(inputBody.sendType == "particular"){
            let list = (inputBody.cisCodes || "").split("\n");
            for(let person of list){
                if(!mergedResponsibilities[person]){
                    rejects.push(`No such CIS as ${person} (who is an exec or student group president)`)
                } else {
                    sendList[person] = mergedResponsibilities[person];
                }
            }
        } else {
            sendList = mergedResponsibilities;
            if(inputBody.letter == "form3"){sendList = []; rejects.push("Must not send to all for letter 3. Denied.")};
        }

        // switches between letters, and their pre-requesites
        
        // letter 1:
        if(inputBody.letter == "form1"){
            for(let person of Object.keys(sendList)){
                let dataOfPerson = sendList[person];
                await letterOne(person, verification.cis, webmasterCis, (dataOfPerson.societies || []), (dataOfPerson.exec || null));
                sentTo.push(`Sent letter 1 to ${person} (exec: ${dataOfPerson.exec || "No Position"}, president of ${(dataOfPerson.societies || []).length} student groups)`)
            }
        } else if(inputBody.letter == "form2"){
            for(let person of Object.keys(sendList)){
                let dataOfPerson = sendList[person];
                if(!dataOfPerson.societies || dataOfPerson.societies.length == 0){
                    rejects.push(`Could not send to ${person} - not a student group president`)
                } else {
                    await letterTwo(person, verification.cis, webmasterCis, (dataOfPerson.societies || []));
                    sentTo.push(`Sent letter 2 to ${person} (president of ${(dataOfPerson.societies || []).length} student groups)`)
                }
            }
        } else if(inputBody.letter == "form3"){
            for(let person of Object.keys(sendList)){
                let dataOfPerson = sendList[person];
                await letterThree(person, verification.cis, webmasterCis, (dataOfPerson.societies || []), (dataOfPerson.exec || null));
                sentTo.push(`Sent letter 3 to ${person} (exec: ${dataOfPerson.exec || "No Position"}, president of ${(dataOfPerson.societies || []).length} student groups)`)
            }
        } else {
            rejects.push("Not specified a valid letter!")
        }

        // logbook
        let logBook = []
        try {
            logBook = await getS3Item(config.buckets.operational,`logs/groups/1-emails.json`)
            logBook = JSON.parse(logBook);
        } catch(err){
            logBook = [];
        }
        logBook.push({
            time: getTime(),
            person: verification.cis,
            notes:sentTo
        })
        try {
            await putS3Item(JSON.stringify(logBook),config.buckets.operational, `logs/groups/1-emails.json`)
        } catch(err){}

        // passback
        const processNote = require("./processNotice");
        event.processName = "Send Email";
        event.processRemarks = `<b>Successes:</b><br>${sentTo.join("<br>")} <br><br> <b>Failures:</b><br>${rejects.join("<br>")}<br><br>`;
            event.processRemarks += `<b>Emails May Have Been Sent</b>`;
            event.allowBack = false;
            event.otherLink = `/exec`
        return await processNote.execute(event,verification)
    }
}

// helper: gather society data by CIS of president
async function pollPresidents(){
    let groups = [];
    groups = await scanItems(config.tables.groups,"NOT(id = :erroneous)",{":erroneous":"x"},undefined);
    if(groups.error){return []};

    let cisStructure = {};
    for(let group of groups){
        let item = {name: group.name, id: group.id};
        let president = group.admins.president;
        for(let person of president){
            if(!cisStructure[person]){
                cisStructure[person] = [];
            }

            cisStructure[person].push(item);
        }
    }

    return cisStructure
}

// helper: gets the exec roles
async function execRoles(){
    let cisStructure = {};
    let ranks = {};

    try {
        ranks = await getS3Item(config.buckets.operational, `executive/roles.json`);
        ranks = JSON.parse(ranks);
        if(!ranks){ranks = {}};
        if(!ranks.main){ranks.main = []};
        if(!ranks.extra){ranks.extra = []};
    } catch(err) {
        return {};
    }

    for(let role of Object.keys(ranks.main)){
        let person = ranks.main[role];
        if(!cisStructure[person]){cisStructure[person] = role}
    }
    for(let role of Object.keys(ranks.extra)){
        let person = ranks.extra[role];
        if(!cisStructure[person]){cisStructure[person] = role}
    }

    return cisStructure
}

// merge responsibilities
function mergeResp(presidentOfSocieties, exec){
    let cisStructure = {};

    for(let person of Object.keys(presidentOfSocieties)){
        cisStructure[person] = {societies: presidentOfSocieties[person]}
    }

    for(let person of Object.keys(exec)){
        if(!cisStructure[person]){
            cisStructure[person] = {};
        }
        cisStructure[person].exec = exec[person];
    }

    return cisStructure

}

// letter constructors

// letter one for new academic year
async function letterOne(recipientCis, senderCis, webmasterEmail, groups = [], exec = null){
    let letter = `<p>
      Hello, as we enter a new academic year, we ask that you help us to keep the website up to date. You are receiving this email,
      either as a member of the JCR exec, or a named president for a student group, or perhaps both!
    </p>
    <p>
      We request you make changes through the intranet. You may do so by logging in to 
      <a href="https://josephine.butlerjcr.com">josephine.butlerjcr.com</a>, entering your CIS code, and waiting for an email with a 
      6-digit code to log in. This process should be intuitive - even for those who have never accessed it before!
    </p>`;

    if(!!exec){
        letter += `<p>
            We have noticed that you are listed as the <b>${exec}</b> for the JCR Exec. We therefore request for you to keep your exec profile up to date.
            This is the (optional) preferred name, avatar, and bio which are shown to anyone who can access the intranet (i.e. members of the college).
            You can do so by:
        </p>
        <ol>
            <li>Logging into the intranet</li>
            <li>On the dashboard that appears, choosing the 'Exec's Portal' card</li>
            <li>On this dashboard, choosing the 'Your Profile' card</li>
            <li>Following the intuitive process in reviewing, and updating your information</li>
        </ol>`
    }

    if(groups.length > 0){
        letter += `<p>We have noticed that you are listed as the (co-)president of at least one student group. Those being:</p><ul>`;
        for(let group of groups){
            letter += `<li>${group.name} (<a href="https://josephine.butlerjcr.com/groups?id=${group.id}">Intranet View</a>)</li>`
        }
        letter += `</ul><p>
        We therefore request that you update the description, any events, the exec, social media, and the logo of the student group, 
        if it is not correct. This includes handing access off to another person, should they be the new president of the student group.
        To do this, you can log into the intranet, and find the student group. The link(s) above give you quick access. You are then able to 
        "Edit Society" (button at the top), and edit the details of the society should they be incorrect.
        </p>`
    }

    letter += `<p>
      If you have any problems, please contact the webmaster at <a href="mailto:${webmasterEmail}">${webmasterEmail}</a> - or alternatively the JCR President at 
      <a href="mailto:butler.jcr@durham.ac.uk">butler.jcr@durham.ac.uk</a> (should there not be a Webmaster).
      Please do so by replying / forwarding this email, ensuring the webmaster / president is added into the email, 
      as this email has information which can help them solve the issue.
    </p>

    <p>
      Best,<br>
      Webmaster
    </p>

    <hr>

    <p>
      Josephine Butler Junior Common Room CIO<br>
      This message has been automatically generated.<br>
      Initialised by ${senderCis}
    </p>`;

    await sendEmail(
        `${recipientCis}@durham.ac.uk`,
        config.fromEmail,
        letter,
        `Important: Your Help for the JCR Website (${recipientCis}; ${new Date().getFullYear()})`,
        config.replytoEmail
    )
}

// letter two for handovers of society exec
async function letterTwo(recipientCis, senderCis, webmasterEmail, groups = []){
    // exec checks not in use

    let letter = `<p>
       Hello, as we end the current academic year, we ask that you help us to keep the website up to date. You are receiving this email, as a named president for a student group. 
    </p>
    <p>
      We request you make changes through the intranet. You may do so by logging in to 
      <a href="https://josephine.butlerjcr.com">josephine.butlerjcr.com</a>, entering your CIS code, and waiting for an email with a 
      6-digit code to log in. This process should be intuitive - even for those who have never accessed it before!
    </p>`;

    if(groups.length > 0){
        letter += `<p>We have noticed that you are listed as the (co-)president of at least one student group. Those being:</p><ul>`;
        for(let group of groups){
            letter += `<li>${group.name} (<a href="https://josephine.butlerjcr.com/groups?id=${group.id}">Intranet View</a>)</li>`
        }
        letter += `</ul><p>
         We therefore request that you review the student group's exec, and update it if there has been changes, or will be after an AGM, so please keep this in mind for after your term in your society exec has ended / is ending. To do this, you can log into the intranet, and find the student group. The link(s) above give you quick access. You are then able to "Edit Society" (button at the top), and edit the details of the society should they be incorrect. 
        </p>`
    }

    letter += `<p>
      If you have any problems, please contact the webmaster at <a href="mailto:${webmasterEmail}">${webmasterEmail}</a> - or alternatively the JCR President at 
      <a href="mailto:butler.jcr@durham.ac.uk">butler.jcr@durham.ac.uk</a> (should there not be a Webmaster).
      Please do so by replying / forwarding this email, ensuring the webmaster / president is added into the email, 
      as this email has information which can help them solve the issue.
    </p>

    <p>
      Best,<br>
      Webmaster
    </p>

    <hr>

    <p>
      Josephine Butler Junior Common Room CIO<br>
      This message has been automatically generated.<br>
      Initialised by ${senderCis}
    </p>`;

    await sendEmail(
        `${recipientCis}@durham.ac.uk`,
        config.fromEmail,
        letter,
        `Handovers: Tell Us About Your Society's Exec (${recipientCis}; ${new Date().getFullYear()})`,
        config.replytoEmail
    )
}

// letter three for new people, targetted
async function letterThree(recipientCis, senderCis, webmasterEmail, groups = [], exec = null){
    let letter = `<p>
       Hello, and welcome to Butler JCR. This email has been triggered manually, as you have recently become a member on the JCR exec, or as you have become a society president. 
    </p>
    <p>
      We request you make changes through the intranet. You may do so by logging in to 
      <a href="https://josephine.butlerjcr.com">josephine.butlerjcr.com</a>, entering your CIS code, and waiting for an email with a 
      6-digit code to log in. This process should be intuitive - even for those who have never accessed it before!
    </p>`;

    if(!!exec){
        letter += `<p>
            We have noticed that you are listed as the <b>${exec}</b> for the JCR Exec. We therefore request for you to keep your exec profile up to date.
            This is the (optional) preferred name, avatar, and bio which are shown to anyone who can access the intranet (i.e. members of the college).
            You can do so by:
        </p>
        <ol>
            <li>Logging into the intranet</li>
            <li>On the dashboard that appears, choosing the 'Exec's Portal' card</li>
            <li>On this dashboard, choosing the 'Your Profile' card</li>
            <li>Following the intuitive process in reviewing, and updating your information</li>
        </ol>`
    }

    if(groups.length > 0){
        letter += `<p>We have noticed that you are listed as the (co-)president of at least one student group. Those being:</p><ul>`;
        for(let group of groups){
            letter += `<li>${group.name} (<a href="https://josephine.butlerjcr.com/groups?id=${group.id}">Intranet View</a>)</li>`
        }
        letter += `</ul><p>
         We therefore request that you review the student group's exec, and update it if there are discrepencies, or if it is a new student group, so you need to add data in! To do this, you can log into the intranet, and find the student group. The link(s) above give you quick access. You are then able to "Edit Society" (button at the top), and edit the details of the society should they be incorrect. 
        </p>`
    }

    letter += `<p>
      If you have any problems, please contact the webmaster at <a href="mailto:${webmasterEmail}">${webmasterEmail}</a> - or alternatively the JCR President at 
      <a href="mailto:butler.jcr@durham.ac.uk">butler.jcr@durham.ac.uk</a> (should there not be a Webmaster).
      Please do so by replying / forwarding this email, ensuring the webmaster / president is added into the email, 
      as this email has information which can help them solve the issue.
    </p>

    <p>
      Best,<br>
      Webmaster
    </p>

    <hr>

    <p>
      Josephine Butler Junior Common Room CIO<br>
      This message has been automatically generated.<br>
      Initialised by ${senderCis}
    </p>`;

    await sendEmail(
        `${recipientCis}@durham.ac.uk`,
        config.fromEmail,
        letter,
        `Welcome: Butler JCR Website (${recipientCis})`,
        config.replytoEmail
    )
}