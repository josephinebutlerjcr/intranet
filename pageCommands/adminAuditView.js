const fs = require("fs");
const config = require("../config.json")
const { getS3Item } = require("../auxilliaryFunctions/s3");

// main
module.exports = {
    name: "GET/admin/audit",
    description: "Admin - check audits",
    execute: async(event, verification) => {
        if(["admin"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        // content find and generator
        let content = "";

        let inputQuery = ""
        if(!!event.queryStringParameters){
            if(!!event.queryStringParameters.id){
                inputQuery = event.queryStringParameters.id;
            }
        }

        if(!inputQuery){
            content = await fullDirectory();
        } else {
            content = await singleLog(inputQuery);
        }
        
        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Audit Logs")
            .replace(/{{pageName}}/g, "System Audit Logs")
            .replace(/{{pageDescriptor}}/g, "")
            .replace(/{{content}}/g, `<button class="redirect-button" onclick="location.href='/exec'">Back to Exec Dashboard</button> | <button class="redirect-button" onclick="history.back()">Go Back</button><div style="font-family: 'Courier New', monospace; text-align: left; margin: 0 auto; max-width: 800px;">${content}</div>`)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}

// full directory loader
async function fullDirectory(){
    // load data
    let groups = await listDirectoryFiles(config.buckets.operational, `logs/groups/`);
    let execPeople = await listDirectoryFiles(config.buckets.operational, `logs/exec/`);
    groups = groups.sort(); execPeople = execPeople.sort();
    
    // content
    let content = ""

    content += `<b>Student Groups</b><br><br>`
    for(let group of groups){
        content += `<a href="/admin/audit?id=group*${group}">${group}</a><br>`
    }

    content += `<br><b>Members of the Exec</b><br><br>`
    for(let person of execPeople){
        content += `<a href="/admin/audit?id=exec*${person}">${person}</a><br>`
    }

    return content
}

// single log
async function singleLog(query){
    // finds location
    let querySplit = query.split("*");
    let searchKey = "";
    let type = ""; let id = querySplit[1];
    if(querySplit[0] == "group"){
        searchKey = `logs/groups/${querySplit[1]}.json`;
        type = "Student Group";
    } else {
        searchKey = `logs/exec/${querySplit[1]}.json`;
        type = "Profile of a Member of the Exec";
    }

    // retrieves file
    let file = {};
    try {
        file = await getS3Item(config.buckets.operational, searchKey);
        file = JSON.parse(file);
    } catch(err){ 
        return await fullDirectory()
    }

    // displays data
    let content = `<b>Audit of ${type}, ${id}</b><br><br>`;
    for(var i = 0; i < file.length; i++){
        let sort = i+1;
        let item = file[i];
        content += `<b>#${sort} - ${new Date(item.time*1000).toLocaleString()}</b><br>Performed by ${item.person}<br>${item.notes.join("<br>")}<br><br>`
    }

    return content;
}

// gets dir objects in S3
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

async function listDirectoryFiles(bucketName, prefix) {
    const s3 = new S3Client({ region: "eu-west-2" });

    let list = [];

    try {
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix,
            Delimiter: "/"
        });

        const response = await s3.send(command);

        if (response.Contents) {
            response.Contents.forEach((item) => {
                const key = item.Key;
                const parts = key.split("/");
                const filename = parts[parts.length - 1];
                if (filename) {
                    const nameWithoutExt = filename.split(".")[0];
                    list.push(nameWithoutExt);
                }
            });
        }
    } catch (err) {
        console.error("Error listing directory files:", err);
    }

    return list;
}
