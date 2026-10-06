const fs = require("fs");
const config = require("../config.json")
const { getItem } = require("../auxilliaryFunctions/dynamodb")
const { getS3Item } = require("../auxilliaryFunctions/s3");

module.exports = {
    name: "GET/admin/affiliations/edit",
    description: "Admin - edit a student group's affiliations",
    execute: async(event, verification) => {
        // user access levels
        if(["admin"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        // list of groups
        let group = {};
        if(event.queryStringParameters && event.queryStringParameters.id){
            group = await getItem(config.tables.groups,{id:event.queryStringParameters.id});
        }

        // no id = general view
        if(!group.id){
            event.queryStringParameters = {};
            const mainPage = require("./adminAffiliationsHubView");
            return await mainPage.execute(event,verification);
        }

        // all organisations we can be affiliated to (pre-sets)
        let organisations = [];
        try { organisations = JSON.parse(await getS3Item(config.buckets.operational,"operations/organisations.json")); } catch(err) {}

        // lists all current affiliations from student group
        const affiliations = group.affiliations || {metadata:{dateValidTo:"",notes:""},affiliates:[]};
        affiliations.metadata = affiliations.metadata || {};
        let affiliateRows = (affiliations.affiliates || []).map(affiliate => affiliateRow(affiliate, organisations)).join("");

        // html content - editor
        let content = `<button class="redirect-button" onclick="location.href='/admin/affiliations'">Back to Affiliations Hub</button>
        <h2>Edit Affiliations: ${group.name}</h2>
        <p>Add one row for each external organisation this group is affiliated with.</p>
        <form action="/admin/affiliations" method="post">
            <input type="hidden" name="action" value="saveAffiliations">
            <input type="hidden" name="id" value="${group.id}">

            <label>Date Valid To</label>
            <input type="date" class="inputField" name="dateValidTo" value="${affiliations.metadata.dateValidTo || ""}" required>

            <label>Affiliation notes</label>
            <textarea class="inputField" name="notes" style="height:70px;">${affiliations.metadata.notes || ""}</textarea>

            <h3>Affiliates</h3>
            <div id="affiliateRows">${affiliateRows}</div>
            <button type="button" class="redirect-button" onclick="addAffiliate()">Add Affiliate</button>

            <input type="submit" class="inputSubmit" value="Save Affiliations">
        </form>
        <br><button class="redirect-button" onclick="location.href='/admin/affiliations'">Cancel and Return to Hub</button>
        <script>
            const organisationOptions = ${JSON.stringify(organisations.map(organisation => `<option value="${organisation.id}">${organisation.name}</option>`).join(""))};
            function addAffiliate(){ document.getElementById("affiliateRows").insertAdjacentHTML("beforeend", affiliateTemplate()); }
            function removeAffiliate(button){ button.parentElement.remove(); }
            function affiliateTemplate(){ return '<div class="affiliateRow" style="border:1px solid #ccc;padding:12px;margin:10px 0;"><label>Organisation</label><select class="inputField" name="affiliateOrganisation">'+organisationOptions+'</select><label>Notes</label><textarea class="inputField" name="affiliateNotes" style="height:50px;"></textarea><label>Membership fee (£)</label><input type="number" class="inputField" name="affiliateMembershipFee" min="0" step="0.01" value="0"><label>Donations (£)</label><input type="number" class="inputField" name="affiliateDonations" min="0" step="0.01" value="0"><button type="button" class="redirect-button" onclick="removeAffiliate(this)">Remove</button></div>'; }
        </script>`;

        // sending HTML back
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Edit Affiliations")
            .replace(/{{pageName}}/g, `Edit Affiliations: ${group.name}`)
            .replace(/{{pageDescriptor}}/g, "")
            .replace(/{{content}}/g, content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}

// affiliate rows - the interactive things
function affiliateRow(affiliate, organisations){
    let options = organisations.map(organisation => `<option value="${organisation.id}" ${organisation.id == affiliate.organisationId ? "selected" : ""}>${organisation.name}</option>`).join("");
    return `<div class="affiliateRow" style="border:1px solid #ccc;padding:12px;margin:10px 0;"><label>Organisation</label><select class="inputField" name="affiliateOrganisation">${options}</select><label>Notes</label><textarea class="inputField" name="affiliateNotes" style="height:50px;">${affiliate.notes || ""}</textarea><label>Membership fee (£)</label><input type="number" class="inputField" name="affiliateMembershipFee" min="0" step="0.01" value="${affiliate.membershipFee || 0}"><label>Donations (£)</label><input type="number" class="inputField" name="affiliateDonations" min="0" step="0.01" value="${affiliate.donations || 0}"><button type="button" class="redirect-button" onclick="removeAffiliate(this)">Remove</button></div>`;
}
