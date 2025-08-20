const fs = require("fs");

// main
module.exports = {
    name: "GET/family",
    description: "Way to view families",
    execute: async(event, verification) => {

        let content = `<button class="redirect-button" onclick="location.href='/'">Back to Dashboard</button><p>Note: we only have data for college children matriculating on or after Michaelmas 2025, and their parents. If you are not on this list, you may not be able to see the tree.</p>`

        content += `<p>Apologies, but this feature is a work in progress, and awaits the allocations for children</p>`

        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "College Families")
            .replace(/{{pageName}}/g, "College Families")
            .replace(/{{pageDescriptor}}/g, "Want to see a nice tree of the college families? Welcome!")
            .replace(/{{content}}/g,  content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}