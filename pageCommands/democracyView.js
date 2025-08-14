const fs = require("fs");
const {listDirectoryFiles, getS3Item} = require("../auxilliaryFunctions/s3")
const config = require("../config.json")
const MarkdownIt = require("markdown-it");
const md = new MarkdownIt();

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
                content = await minutes(minuteId, editAbility);
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
        <h2>Standing Orders</h2>
        <button onclick="location.href='/democracy?doc=so'" class="redirect-button">Click to View</button>
        <h2>Minutes</h2>`;
    
    // allows new minutes
    if(editAbility){
        content += `<button onclick="location.href='/exec/democracy/new'" class="redirect-button">Create New Minute</button>`
    }

    // minutes
    content += "<ul>"

    let democracyArticles = await listDirectoryFiles(config.buckets.operational, `democracy/`);
    democracyArticles = democracyArticles.sort();
    for(let article of democracyArticles){
        if(article == "0-standing-orders"){continue;}
        else {
            let time = article.split("-")[1];
            content += `<li><a href="/democracy?doc=min&id=${article}">First Published: ${new Date(time * 1000).toLocaleString('en-GB', { timeZone: 'Europe/London' })}</a></li>`
        }
    }

    // concludes contents
    content += `</ul></div>`

    return content;
}

// loads standing orders
async function standingOrders(editAbility){
    let standingOrderData = {};
    try {
        standingOrderData = await getS3Item(config.buckets.operational, "democracy/0-standing-orders.json");
        standingOrderData = JSON.parse(standingOrderData)
    } catch(err){
        standingOrderData = {
            "published":0,
            "edit":0,
            "title":"Standing Orders",
            "markdownData":"# Sorry\n\nWe could not load the standing orders. Please try again later. If this error persists, contact the webmaster."
        }
    }

    content = `<button class="redirect-button" onclick="location.href='/democracy'">Democracy Pages</button>
    <div style="text-align: left; margin: 0 auto; max-width: 800px;"><h2>Standing Orders</h2>`

    if(editAbility){
        content += `<button onclick="location.href='/exec/democracy/edit?id=0-standing-orders'" class="redirect-button">Edit Standing Orders</button>`
    }

    content += `<p>=== BEGINS ===</p>`

    content += md.render(standingOrderData.markdownData).replace(/\n/g,"<br>").replace(/<p>/g,"").replace(/<\/p>/g,"")

    content += `<p>=== ENDS ===</p</div>`

    return content;
}

// loads specific minute
async function minutes(minuteId, editAbility){
    let minute = {};
    try {
        minute = await getS3Item(config.buckets.operational, `democracy/${minuteId}.json`);
        minute = JSON.parse(minute)
    } catch(err){
        minute = {
            "published":0,
            "edit":0,
            "title":"Sorry",
            "markdownData":"We could not load the minute, perhaps because it does not exist. Please try again later. If this error persists, contact the webmaster."
        }
    }

    content = `<button class="redirect-button" onclick="location.href='/democracy'">Democracy Pages</button>
    <div style="text-align: left; margin: 0 auto; max-width: 800px;"><h2>${minute.title}</h2>`

    if(editAbility){
        content += `<button onclick="location.href='/exec/democracy/edit?id=${minuteId}'" class="redirect-button">Edit Minute</button>`
    }

    content += `<p>=== BEGINS ===</p>`

    content += md.render(minute.markdownData).replace(/\n/g,"<br>").replace(/<p>/g,"").replace(/<\/p>/g,"")

    content += `<p>=== ENDS ===</p</div>`

    return content;
}