const fs = require("fs");

module.exports = {
    name: "X-PROCESS",
    description: "Notes the Process",
    execute: async(event, verification) => {
        let content = `<h2>Processed: ${event.processName}</h2><p>${event.processRemarks}</p>`

        if(event.allowBack){
            content += `<br><button class="redirect-button" onclick="history.back()">Go Back</button>`
        }
        if(!!event.otherLink){
            content += `<br><button class="redirect-button" onclick="location.href = '${event.otherLink}'">Next</button>`
        }

        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Processed")
            .replace(/{{pageName}}/g, "Processed Item")
            .replace(/{{pageDescriptor}}/g, "")
            .replace(/{{content}}/g, content)
        
        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}