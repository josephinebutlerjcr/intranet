const fs = require("fs");
const {listDirectoryFiles, getS3Item} = require("../auxilliaryFunctions/s3")
const config = require("../config.json")

// main
module.exports = {
    name: "GET/democracy",
    description: "General Democracy Page",
    execute: async(event, verification) => {
        let editAbility = false;
        if(["chair","admin"].includes(verification.privilege)){
            editAbility = true;
        }
        
        // main content
        let content = "";
        if(!!event.queryStringParameters && !!event.queryStringParameters.doc){
            if(event.queryStringParameters.doc == "so"){
                content = await standingOrders(editAbility);
            } else if(event.queryStringParameters.doc == "min" && !!event.queryStringParameters.id){
                content = await minutes(event.queryStringParameters.id, editAbility);
            }
        }
        if(!content){
            content = await mainPage(editAbility);
        }
        
        
        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Democracy")
            .replace(/{{pageName}}/g, "Democracy Page")
            .replace(/{{pageDescriptor}}/g, "")
            .replace(/{{content}}/g,  content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}

// loads general front page
async function mainPage(editAbility){
    // base line
    let content = 
        `<button class="redirect-button" onclick="location.href='/'">Back to Dashboard</button><div style="text-align: left; margin: 0 auto; max-width: 800px;">
        <h2>Notices</h2>
        <p>If you require an alternative format of documents for accessibility reasons, please contact <a href="mailto:butler.chair@durham.ac.uk">butler.chair@durham.ac.uk</a>.
        All documents here are currently in the PDF format.</p>
        <h2>Standing Orders</h2>
        <button onclick="location.href='/democracy?doc=so'" class="redirect-button">Click to View</button>
        <h2>Minutes</h2>`;
    
    // allows new minutes
    if(editAbility){
        content += `<button onclick="location.href='/exec/democracy/new'" class="redirect-button">Create New Minute</button><br>`
    }

    // minutes
    let democracyArticles = await listDirectoryFiles(config.buckets.content, `democracy/`);
    democracyArticles = democracyArticles.sort();

    let dataStructure = {} // categories on first level, year on the second

    for(let article of democracyArticles){
        if(article == "0-standing-orders"){continue;}
        else {
            let category = article.split("-")[1];
            let year = article.split("-")[2];
            if(!dataStructure[category]){
                dataStructure[category] = {}
            }
            if(!dataStructure[category][year]){
                dataStructure[category][year] = []
            }
            dataStructure[category][year].push(article)
        }
    }

    // goes through each category
    let categories =  Object.keys(dataStructure);
    categories = categories.sort();
    for(let category of categories){
        content += `<br><b>${category}</b><ul>`

        let years = Object.keys(dataStructure[category]);
        years = years.sort()
        for(let year of years){
            content += `<li>${year}<ul>`

            let documents = dataStructure[category][year];
            documents = documents.sort();

            for(let article of documents){
                let time = article.split("-")[0];
                let name = article.split("-")[3];

                content += `<li><a href="/democracy?doc=min&id=${article}">${name} (published ${new Date(time * 1000).toLocaleString('en-GB', { timeZone: 'Europe/London' })})</a></li>`
            }

            content += `</ul></li>`
        }

        content += `</ul>`
    }

    // concludes contents
    content += `</div>`

    return content;
}

// loads standing orders
async function standingOrders(editAbility){
    let content = `<button class="redirect-button" onclick="location.href='/democracy'">Democracy Pages</button>`;
    try {
        standingOrderData = await getS3Item(config.buckets.content, "democracy/0-standing-orders.pdf");
    } catch(err){
        content += "<p>Apologies we could not find the Standing Orders</p>"
        return content;
    }

    if(editAbility){
        content += ` | <button onclick="location.href='/exec/democracy/edit?id=0-standing-orders'" class="redirect-button">Edit Standing Orders</button>`
    }

    content += `<br>
    <div style="width: 100%; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8f9fa; border: 1px solid #ddd; border-radius: 12px; overflow: hidden;">
    <object data="https://${config.buckets.content}.s3.eu-west-2.amazonaws.com/democracy/0-standing-orders.pdf" type="application/pdf" width="100%" height="100%">
        <p>Unable to display the PDF directly in your browser.</p>
    </object>
    </div>
    <p><a href="https://${config.buckets.content}.s3.eu-west-2.amazonaws.com/democracy/0-standing-orders.pdf" target="_blank">Open in New Tab</a></p>`

    return content;
}

// loads specific minute
async function minutes(minuteId, editAbility){
    let content = `<button class="redirect-button" onclick="location.href='/democracy'">Democracy Pages</button>`;
    try {
        standingOrderData = await getS3Item(config.buckets.content, `democracy/${minuteId}.pdf`);
    } catch(err){
        content += "<p>Apologies we could not find the minutes</p>"
        return content;
    }

    if(editAbility){
        content += ` | <button onclick="location.href='/exec/democracy/edit?id=${minuteId}'" class="redirect-button">Edit</button>`
    }

    let time = minuteId.split("-")[0];
    let category = minuteId.split("-")[1];
    let year = minuteId.split("-")[2];
    let name = minuteId.split("-")[3];

    content += `<br>
    <p style="text-align: left;">
        <b>Published on</b> ${new Date(time * 1000).toLocaleString('en-GB', { timeZone: 'Europe/London' })} <br>
        <b>Category</b> ${category} <br>
        <b>Academic Year</b> Starting on Michaelmas ${year} <br>
        <b>Title</b> ${name}
    </p>
    <div style="width: 100%; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8f9fa; border: 1px solid #ddd; border-radius: 12px; overflow: hidden;">
    <object data="https://${config.buckets.content}.s3.eu-west-2.amazonaws.com/democracy/${minuteId}.pdf" type="application/pdf" width="100%" height="100%">
        <p>Unable to display the PDF directly in your browser.</p>
    </object>
    </div>
    <p><a href="https://${config.buckets.content}.s3.eu-west-2.amazonaws.com/democracy/${minuteId}.pdf" target="_blank">Open in New Tab</a></p>`

    return content;
}