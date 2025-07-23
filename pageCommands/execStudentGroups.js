const fs = require("fs");
const config = require("../config.json")
const { scanItems, getItem } = require("../auxilliaryFunctions/dynamodb")

// main
module.exports = {
    name: "GET/exec/groups",
    description: "Exec's Student Groups Dashboard",
    execute: async(event, verification) => {
        // user access levels
        if(["chair","admin","exec"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        // choses which content
        let content = ``;
        let society = {};

        // checks querystring
        if(!!event.queryStringParameters){
            if(!!event.queryStringParameters.id){
                let groupId = event.queryStringParameters.id;
                let tmpSoc = await getItem(config.tables.groups, {id: groupId});
                if((tmpSoc.error || tmpSoc.id != groupId) == false){
                    society = tmpSoc;
                }
            }
        }

        // sends whatever depending on resp
        if(!society.id){
            // no soc: content is of tables
            content += await tableView();
        } else {
            content += await societyView(society);
        }
        
        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Group Registry")
            .replace(/{{pageName}}/g, "Student Groups' Registry")
            .replace(/{{pageDescriptor}}/g, "A register of all student groups registered at the JCR, and managing them")
            .replace(/{{content}}/g, content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}

// view for the full table
async function tableView(){
    // fetch student groups
    let groups = [];
    groups = await scanItems(config.tables.groups,"NOT(id = :erroneous)",{":erroneous":"x"},undefined);

    // generates table content
    let tableContent = "";
    for(const group of groups){
        tableContent += 
        `<tr>
            <td>${group.name}</td>
            <td>${group.category}</td>
            <td><a href="/exec/groups?id=${group.id}">View More</a> | <a href="/exec/groups/edit?id=${group.id}">Edit</a></td>
        </tr>`
    }

    // main content
    let content = 
    `<script src="https://code.jquery.com/jquery-3.7.1.slim.min.js" integrity="sha256-kmHvs0B+OpCW5GVHUNjv9rOmY0IvSIRcf7zGUDTDQM8=" crossorigin="anonymous"></script><link rel="stylesheet" href="https://cdn.datatables.net/2.3.2/css/dataTables.dataTables.css" /><script src="https://cdn.datatables.net/2.3.2/js/dataTables.js"></script>
    
    <button class="redirect-button" onclick="location.href='/'">Back to Dashboard</button> |
    <button class="redirect-button" onclick="location.href='/exec'">Executive's Dashboard</button> |
    <button class="redirect-button" onclick="location.href='/exec/groups/new'">Create New Group</button>

    <br><br>

    <table id="groupsTable" class="display" style="text-align: left;">
        <thead style="font-weight: bold;"><tr>
            <td>Group Name</td>
            <td>Type</td>
            <td>Actions</td>
        </tr></thead>
        <tbody>
            ${tableContent}
        </tbody>
    </table>

    <script>
        $(document).ready( function () {
            $("#groupsTable").DataTable();
        } );
    </script>`;

    return content;
}

// view for individual society
async function societyView(society){
    // soc people directory
    let societyPeople = "";
    let roleNames = Object.keys(society.admins);
    for(const role of roleNames){
        const peopleCIS = society.admins[role];
        let extraCo = "";
        if(peopleCIS.length != 1){extraCo = "co-"}

        for(const personCIS of peopleCIS){
            const person = await getItem(config.tables.users, {cis: personCIS});
            let personName = person.name || personCIS;
            societyPeople += `${extraCo}${role}: ${personName} (<a href="mailto:${personCIS}@durham.ac.uk" target="_blank">${personCIS}</a>)<br>`;
        }
    }

    // events
    let events = "";
    for(const event of society.events){
        events += `${event.date}; ${event.time}; ${event.location}; ${event.title}; <br>`
    }

    // avatar
    let avatar = "None on Record";
    if(society.avatar == true){
        avatar = ` <img src="https://butler-jcr-public.s3.eu-west-2.amazonaws.com/societylogo/${society.id}.jpg" width="250" height="250">`
    }

    // social medias
    let socials = "";
    if(!!society.socials.instagram){socials += `Instagram: <a href="https://instagram.com/${society.socials.instagram}" target="_blank">@${society.socials.instagram}</a><br>`}
    if(!!society.socials.whatsapp){socials += `WhatsApp: <a href="https://chat.whatsapp.com/${society.socials.whatsapp}" target="_blank">group</a><br>`}
    if(!!society.socials.facebook){socials += `Facebook: <a href="${society.socials.facebook}" target="_blank">page / group</a><br>`}
    
    society.awards = society.awards || [];

    // content 
    let content = 
    `<button class="redirect-button" onclick="location.href='/'">Back to Dashboard</button> |
    <button class="redirect-button" onclick="location.href='/exec'">Executive's Dashboard</button> |
    <button class="redirect-button" onclick="location.href='/exec/groups/edit?id=${society.id}'">Edit This Group</button> |
    <button class="redirect-button" onclick="location.href='/exec/groups'">View All Groups</button>
    
    <section style="display: flex; justify-content: center;">
        <section class="latest-news" style="padding: 3rem 1rem; max-width: 600px; text-align: left;">
            <h2 style="text-align: center;">${society.name}</h2>
            <p>
                To edit details, please press the "Edit This Group" button above<br><br>
                <b>Internal ID:</b> ${society.id} <br>
                <b>Category:</b> ${society.category} <br> <br>
                <b>Description:</b> <br>
                ${society.description.replace(/\n/g,"<br>")} <br> <br>
                <b>Awards:</b> <br>
                ${society.awards.join("<br>")} <br> <br>
                <b>People:</b> <br>${societyPeople} <br>
                <b>Socials:</b> <br>${socials} <br>
                <b>Events:</b> <br>${events} <br>
                <b>Avatar:</b><br>
                ${avatar}
            </p>
        </section>
    </section>`;

    return content;
}