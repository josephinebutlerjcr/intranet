const fs = require("fs");
const config = require("../config.json")
const { scanItems } = require("../auxilliaryFunctions/dynamodb")
const { getS3Item } = require("../auxilliaryFunctions/s3");

module.exports = {
    name: "GET/admin/affiliations/report",
    description: "Admin - affiliations report",
    execute: async(event, verification) => {
        if(["admin"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        let organisations = [];
        try { organisations = JSON.parse(await getS3Item(config.buckets.operational,"operations/organisations.json")); } catch(err) {}
        let groups = await scanItems(config.tables.groups,"NOT(id = :erroneous)",{":erroneous":"x"},undefined);
        let report = [];

        for(const organisation of organisations){
            let entries = [];
            for(const group of groups){
                const affiliates = group.affiliations && group.affiliations.affiliates || [];
                for(const affiliate of affiliates){
                    if(affiliate.organisationId == organisation.id){ entries.push({group,affiliate}); }
                }
            }
            if(entries.length > 0){
                const membershipTotal = entries.reduce((total, entry) => total + Number(entry.affiliate.membershipFee || 0), 0);
                const donationsTotal = entries.reduce((total, entry) => total + Number(entry.affiliate.donations || 0), 0);
                report.push(`<section style="page-break-inside:avoid;"><h2><b>${organisation.name}</b></h2><p><b>Total membership fees:</b> £${membershipTotal.toFixed(2)}<br><b>Total donations:</b> £${donationsTotal.toFixed(2)}</p><table style="width:100%;text-align:left;"><thead><tr><th>Society / Group</th><th>Notes</th><th>Membership fee</th><th>Donation</th></tr></thead><tbody>${entries.map(entry => `<tr><td>${entry.group.name}</td><td>${entry.affiliate.notes || "None"}</td><td>£${Number(entry.affiliate.membershipFee || 0).toFixed(2)}</td><td>£${Number(entry.affiliate.donations || 0).toFixed(2)}</td></tr>`).join("")}</tbody></table></section>`);
            }
        }

        let content = `<button class="redirect-button" onclick="location.href='/admin/affiliations'">Back to Affiliations Hub</button><button class="redirect-button" onclick="window.print()">Print Report</button><h2>Affiliations Report</h2><p>Generated ${new Date().toLocaleString("en-GB",{timeZone:"Europe/London"})}</p>${report.join("<hr>") || "<p>No student groups are currently affiliated with an external organisation.</p>"}`;
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString().replace(/{{pageNameShort}}/g,"Affiliations Report").replace(/{{pageName}}/g,"Affiliations Report").replace(/{{pageDescriptor}}/g,"").replace(/{{content}}/g,content);
        return {body:resp,headers:{"Content-Type":"text/html"}}
    }
}
