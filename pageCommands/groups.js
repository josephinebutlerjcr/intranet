const fs = require("fs");
const { getItem, scanItems } = require("../auxilliaryFunctions/dynamodb")
const config = require("../config.json")

// main
module.exports = {
    name: "GET/groups",
    description: "Student Groups",
    execute: async(event, verification) => {
        // filters to chose content
        let content = "";

        // checks querystring
        if(!!event.queryStringParameters){
            // for the individual society
            if(!!event.queryStringParameters.id){
                let groupId = event.queryStringParameters.id;
                let tmpSoc = await getItem(config.tables.groups, {id: groupId});
                if((tmpSoc.error || tmpSoc.id != groupId) == false){
                    society = tmpSoc;
                }
                content = await individualSociety(society);
            } 
            // or gets a list
            else if(!!event.queryStringParameters.mode){
                if(event.queryStringParameters.mode == "list"){
                    let list = await societiesList();
                    return {
                        body: JSON.stringify(list),
                        headers:{"Content-Type":"application/json"}
                    }
                }
            }
        }

        // base body
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()

        // if no indiv soc, gets content
        if(!content){
            content = await mainPreview();
            resp = resp.replace(/{{pageNameShort}}/g, "Student Groups")
                        .replace(/{{pageName}}/g, "Our Student Groups")
                        .replace(/{{pageDescriptor}}/g, "More information on all student groups at Butler JCR")
                        .replace(/{{content}}/g, content)
        } else {
            resp = resp.replace(/{{pageNameShort}}/g, "Student Group")
                        .replace(/{{pageName}}/g, "")
                        .replace(/{{pageDescriptor}}/g, "")
                        .replace(/{{content}}/g, content)
        }

        // rtn
        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}

// individual view
async function individualSociety(society){
    let socials = ""; let exec = ""; let logo = `<img src="https://placehold.co/400?text=${society.category}" alt="No Logo">`; let societyAwards = "";

    // social medias
    if(!!society.socials.instagram){socials += `<a href="https://instagram.com/${society.socials.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>`}
    if(!!society.socials.whatsapp){socials += `<a href="https://chat.whatsapp.com/${society.socials.whatsapp}" target="_blank"><i class="fab fa-whatsapp"></i></a>`}

    // exec
    let roleNames = Object.keys(society.admins);
    for(const role of roleNames){
        const peopleCIS = society.admins[role];
        let extraCo = "";
        if(peopleCIS.length != 1){extraCo = "co-"}

        for(const personCIS of peopleCIS){
            const person = await getItem(config.tables.users, {cis: personCIS});
            let cisDisplay = true;
            if(!person.name){cisDisplay = false}
            let personName = person.name || "An Unknown Person";
            if(cisDisplay){
                exec += `${extraCo}${role}: ${personName} (<a href="mailto:${personCIS}@durham.ac.uk" target="_blank">${personCIS}</a>)<br>`;
            } else {
                exec += `${extraCo}${role}: (Name Not On Display)<br>`;
            }
        }
    }

    // logo
    if(society.avatar){logo = `<img src="https://butler-jcr-public.s3.eu-west-2.amazonaws.com/societylogo/${society.id}.jpg">`}

    // awards
    if(!!society.awards){
        for(let award of society.awards){
            societyAwards += `<span class="tag">${award}</span>`
        }
    }

    return  `
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">

<button class="redirect-button" onclick="history.back()">Go Back</button>

<div class="groupSummary">
  <div class="logo">
    ${logo}
  </div>

  <div class="details">
    <div class="name">${society.name}</div>
    <div class="description">
      ${society.description}
    </div>
    <div class="description">
    	<b>Executive of the Charity:</b><br>
        ${exec}
    </div>
    <div class="tags">
      <span class="tag">${society.category}</span>
      ${societyAwards}
    </div>
    <div class="socials">
      ${socials}
    </div>
  </div>
</div>
`;
}

// socs list
async function societiesList(){
    let groupsUnfiltered = await scanItems(config.tables.groups,"NOT(id = :erroneous)",{":erroneous":"x"},undefined);
    let finalList = [];

    for(let group of groupsUnfiltered){
        finalList.push({
            id: group.id,
            name: group.name,
            category: group.category,
            socials: group.socials,
            avatar: group.avatar
        })
    }

    return finalList;
}

// main preview
async function mainPreview(){
    let element = fs.readFileSync("./assets/elements/groupDirectory.html").toString();
    return element;
}