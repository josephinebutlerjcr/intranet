const fs = require("fs");
const config = require("../config.json")
const { scanItems, getItem } = require("../auxilliaryFunctions/dynamodb")
const { getS3Item } = require("../auxilliaryFunctions/s3");

module.exports = {
    name: "GET/admin/affiliations",
    description: "Admin - affiliations hub",
    execute: async(event, verification) => {
        // user access levels
        if(["admin"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        // individual groups have their own page so the main hub does not need to scan the groups table
        if(event.queryStringParameters && event.queryStringParameters.id){
            const editPage = require("./adminAffiliationsEditView");
            return await editPage.execute(event, verification);
        }


        let organisations = [];
        try { 
            organisations = JSON.parse(await getS3Item(config.buckets.operational,"operations/organisations.json")); 
        } catch(err) {}
        
        let groups = await scanItems(config.tables.groups,"NOT(id = :erroneous)",{":erroneous":"x"},undefined);
        let selected = {};

        if(event.queryStringParameters && event.queryStringParameters.id){
            selected = await getItem(config.tables.groups,{id:event.queryStringParameters.id}); 
        }
        let selectedOrganisation = {};
        if(event.queryStringParameters && event.queryStringParameters.organisation){
            selectedOrganisation = organisations.find(x => x.id == event.queryStringParameters.organisation) || {};
        }

        let groupRows = groups.map(group => {
            let date = group.affiliations && group.affiliations.metadata && group.affiliations.metadata.dateValidTo;
            let state = "Not recorded";
            if(date){ 
                const days = Math.ceil((new Date(date) - new Date()) / 86400000); 
                state = days < 0 ? `<span style="color:red">Lapsed</span>` : (days <= 30 ? `<span style="color:darkorange">Due within ${days} days</span>` : "Current"); 
            }
            return `<tr><td>${group.name}</td><td>${group.category}</td><td>${date || "Not set"}</td><td>${state}</td><td><a href="/admin/affiliations/edit?id=${group.id}">Edit</a></td></tr>`
        }).join("");
        
        let editPanel = "";
        if(selected.id){
            const affiliations = selected.affiliations || {metadata:{dateValidTo:"",notes:""},affiliates:[]}; 
            affiliations.metadata = affiliations.metadata || {};

            editPanel = `<hr><h2>Edit Affiliations: ${selected.name}</h2>
            <form action="/admin/affiliations" method="post">
                <input type="hidden" name="action" value="saveAffiliations">
                <input type="hidden" name="id" value="${selected.id}">
                <label>Date Valid To</label><input type="date" class="inputField" name="dateValidTo" value="${affiliations.metadata.dateValidTo || ""}" required>
                <label>Affiliation notes</label><br>
                <textarea class="inputField" name="notes" style="height:70px;">${affiliations.metadata.notes || ""}</textarea><br>
                <label>Affiliates (one JSON object per line: organisationId, notes, membershipFee, donations)</label><br>
                <textarea class="inputField" name="affiliates" style="height:180px;" required>${(affiliations.affiliates || []).map(x => JSON.stringify(x)).join("\n")}</textarea>
                <input type="submit" class="inputSubmit" value="Save Affiliations">
            </form>`;
        }

        let organisationRows = organisations.map(org => `<tr><td>${org.name}</td><td>${org.address}</td><td>${org.description}</td><td>${org.id}</td><td><a href="/admin/affiliations?organisation=${org.id}">Edit</a></td></tr>`).join("");
        let organisationEdit = "";

        if(selectedOrganisation.id){
            organisationEdit = `<hr><h3>Edit External Organisation</h3>
            <form action="/admin/affiliations" method="post">
                <input type="hidden" name="action" value="editOrganisation">
                <input type="hidden" name="id" value="${selectedOrganisation.id}">
                <label>Name</label>
                <input type="text" class="inputField" name="name" value="${selectedOrganisation.name}" required maxlength="128">
                <label>Address</label><br>
                <textarea class="inputField" name="address" required maxlength="512">${selectedOrganisation.address}</textarea><br>
                <label>Description</label><br>
                <textarea class="inputField" name="description" required maxlength="2048">${selectedOrganisation.description}</textarea>
                <input type="submit" class="inputSubmit" value="Save Organisation">
            </form>`;
        }
        let content = `<button class="redirect-button" onclick="location.href='/exec'">Executive's Dashboard</button><button class="redirect-button" onclick="location.href='/admin/affiliations/report'">Generate Affiliations Report</button><h2>Affiliations Hub</h2>
        <p>Manage external organisations and review each student group's affiliations.</p>
        <h3>Student groups</h3>
        <table id="affiliationsTable" class="display" style="text-align:left;">
            <thead><tr>
                <th>Group</th>
                <th>Type</th>
                <th>Date Valid To</th>
                <th>Status</th>
                <th>Actions</th>
            </tr></thead>
            <tbody>${groupRows}</tbody>
        </table>
        ${editPanel}
        <hr>
        <h3>Add External Organisation</h3>
        <form action="/admin/affiliations" method="post">
            <input type="hidden" name="action" value="addOrganisation">
            <label>Name</label>
            <input type="text" class="inputField" name="name" required maxlength="128">
            <label>Address</label><br>
            <textarea class="inputField" name="address" required maxlength="512"></textarea><br>
            <label>Description</label><br>
            <textarea class="inputField" name="description" required maxlength="2048"></textarea>
            <input type="submit" class="inputSubmit" value="Add Organisation">
        </form>
        ${organisationEdit}
        <h3>External organisations</h3>
        <table class="display" style="text-align:left;">
            <thead><tr>
                <th>Name</th>
                <th>Address</th>
                <th>Description</th>
                <th>ID</th>
                <th>Actions</th>
            </tr></thead>
            <tbody>${organisationRows}</tbody>
        </table>
        <script src="https://code.jquery.com/jquery-3.7.1.slim.min.js"></script>
        <link rel="stylesheet" href="https://cdn.datatables.net/2.3.2/css/dataTables.dataTables.css">
        <script src="https://cdn.datatables.net/2.3.2/js/dataTables.js"></script>
        <script>$(document).ready(function(){$("#affiliationsTable").DataTable();});</script>`;

        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Affiliations Hub")
            .replace(/{{pageName}}/g, "Affiliations Hub")
            .replace(/{{pageDescriptor}}/g, "")
            .replace(/{{content}}/g,  content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}
