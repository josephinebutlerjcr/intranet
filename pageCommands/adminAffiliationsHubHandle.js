const config = require("../config.json")
const { getItem, putItem } = require("../auxilliaryFunctions/dynamodb")
const { getS3Item, putS3Item } = require("../auxilliaryFunctions/s3")
const { parseBody, getTime } = require("../auxilliaryFunctions/formatting")
const { sendEmail } = require("../auxilliaryFunctions/email")

module.exports = {
    name: "POST/admin/affiliations",
    description: "Admin - affiliations hub HANDLER",
    execute: async(event, verification) => {
        // user access
        if(["admin"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403"); 
            return await forbiddenPage.execute(event,verification) 
        }

        // data
        const input = await parseBody(event.body); 
        let success = [];
        let failure = [];

        // option 1: adding organisation
        if(input.action == "addOrganisation"){

            // inp checks
            if(!input.name || !input.address || !input.description){ 
                failure.push("Name, address and description are mandatory."); 
            } else { 
                // get organisation roll
                let organisations = []; 
                try { 
                    organisations = JSON.parse(await getS3Item(config.buckets.operational,"operations/organisations.json")); 
                } catch(err) {} 
                
                // organisation creation
                const organisation = {
                    id:require("crypto").randomUUID(),
                    name:input.name,
                    address:input.address,
                    description:input.description,
                    createdAt:getTime(),
                    createdBy:verification.cis
                }; 
                
                // commit
                organisations.push(organisation); 
                await putS3Item(JSON.stringify(organisations,null,4),config.buckets.operational,"operations/organisations.json"); 

                // log writing
                success.push(`Added external organisation "${organisation.name}" (${organisation.id}) - ${JSON.stringify(organisation)}`); 
                await writeLog(verification, success);
            }

        // option 2: editing an organisation
        } else if(input.action == "editOrganisation"){
            // organisation roll
            let organisations = [];
            try { 
                organisations = JSON.parse(await getS3Item(config.buckets.operational,"operations/organisations.json")); 
            } catch(err) {}
            
            // find organisation
            let organisation = organisations.find(x => x.id == input.id);
            if(!organisation){
                failure.push("External organisation does not exist.");
            } else if(!input.name || !input.address || !input.description){
                // inp checks
                failure.push("Name, address and description are mandatory.");
            } else {
                // allow changes and commit
                organisation.name = input.name;
                organisation.address = input.address;
                organisation.description = input.description;
                organisation.lastChangedAt = getTime();
                organisation.lastChangedBy = verification.cis;
                await putS3Item(JSON.stringify(organisations,null,4),config.buckets.operational,"operations/organisations.json");

                // logging
                success.push(`Changed external organisation "${organisation.id}" - new data ${JSON.stringify(organisation)}`);
                await writeLog(verification, success);
            }
        
        // option 3: saving data for an affiliate
        } else if(input.action == "saveAffiliations"){
            // find group and existance
            const group = await getItem(config.tables.groups,{id:input.id});
            if(group.error || group.id != input.id){ 
                failure.push("Student group does not exist."); 

            } else if(!/^\d{4}-\d{2}-\d{2}$/.test(input.dateValidTo)){ 
                // date check (basic - idc otherwise lol)
                failure.push("Date Valid To is invalid."); 

            } else { 
                // validation
                let affiliates = [];
                let organisationIds = input.affiliateOrganisation || [];
                let affiliateNotes = input.affiliateNotes || [];
                let membershipFees = input.affiliateMembershipFee || [];
                let donations = input.affiliateDonations || [];
                if(!Array.isArray(organisationIds)){ organisationIds = [organisationIds]; }
                if(!Array.isArray(affiliateNotes)){ affiliateNotes = [affiliateNotes]; }
                if(!Array.isArray(membershipFees)){ membershipFees = [membershipFees]; }
                if(!Array.isArray(donations)){ donations = [donations]; }
                for(let i = 0; i < organisationIds.length; i++){
                    if(organisationIds[i]){
                        affiliates.push({
                            organisationId: organisationIds[i],
                            notes: affiliateNotes[i] || "",
                            membershipFee: Number(membershipFees[i] || 0),
                            donations: Number(donations[i] || 0)
                        });
                    }
                }
                
                // failure recording
                if(failure.length == 0){ 
                    for(const affiliate of affiliates){
                        if(!affiliate.organisationId || typeof affiliate.notes != "string" || isNaN(Number(affiliate.membershipFee)) || isNaN(Number(affiliate.donations)) || Number(affiliate.membershipFee) < 0 || Number(affiliate.donations) < 0){
                            failure.push("Every affiliate needs an organisation, notes, and non-negative membership and donation amounts.");
                            break; 
                        } 
                    } 
                } 
                
                // success case: continue
                if(failure.length == 0){ 
                    // template
                    group.affiliations = {
                        metadata: {
                            dateValidTo:input.dateValidTo,
                            notes:input.notes || "",
                            lastChangedAt:getTime(),
                            lastChangedBy:verification.cis
                        },
                        affiliates:affiliates
                    }; 
                        
                    // put
                    await putItem(config.tables.groups,group);
                    
                    // organisation update
                    let organisations = [];
                    try {
                        organisations = JSON.parse(await getS3Item(config.buckets.operational,"operations/organisations.json"));
                    } catch(err) {}
                    let affiliateSummary = "No affiliates";
                    if(affiliates.length > 0){
                        affiliateSummary = affiliates.map(affiliate => {
                            let organisation = organisations.find(x => x.id == affiliate.organisationId);
                            return `${organisation ? organisation.name : affiliate.organisationId}: membership £${Number(affiliate.membershipFee).toFixed(2)}, donations £${Number(affiliate.donations).toFixed(2)}, notes: ${affiliate.notes || "None"}`;
                        }).join("<br>");
                    }

                    // logging
                    success.push(`Updated affiliations for ${group.name} - ${affiliateSummary}`); 
                    await writeLog(verification, success);

                    // emailing presiden
                    for(const president of ((group.admins && group.admins.president) || [])){ 
                        await sendEmail(`${president}@durham.ac.uk`,config.fromEmail,
                            `<p>The affiliations data for <b>${group.name}</b> has been updated on your behalf by ${verification.cis}.</p>
                            <p><b>Date Valid To:</b> ${input.dateValidTo}<br>
                            <b>Affiliates:</b><br>${affiliateSummary}<br>
                            <b>Notes:</b> ${(input.notes || "").replace(/\n/g,"<br>")}</p><br><br>
                            <p>If there are any errors with this data, please contact the Compliance and Governance Officer at admin@butlerjcr.com. Should they not exist, contact ${verification.cis}.</p>`
                        ,`Affiliations updated (${group.name})`,config.replytoEmail); 
                    } 
                }
            }
        }

        // return page
        event.processName = "Manage Affiliations"; 
        event.processRemarks = `<b>Successes:</b><br>${success.join("<br>") || "None"}<br><br><b>Failures:</b><br>${failure.join("<br>") || "None"}`; 
        event.allowBack = true;
        event.otherLink = input.action == "saveAffiliations" ? `/admin/affiliations/edit?id=${input.id}` : "/admin/affiliations";
        
        return await require("./processNotice").execute(event,verification)
    }
}

// writes the standard operational audit log
async function writeLog(verification, notes){
    let logBook = [];
    try {
        logBook = JSON.parse(await getS3Item(config.buckets.operational,"logs/operational/affiliations.json"));
    } catch(err) {}
    logBook.push({
        time: getTime(),
        person: verification.cis,
        notes: notes
    });
    try {
        await putS3Item(JSON.stringify(logBook),config.buckets.operational,"logs/operational/affiliations.json");
    } catch(err) {}
}
