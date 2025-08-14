const fs = require("fs");
const { getS3Item } = require("../auxilliaryFunctions/s3");
const config = require("../config.json")

module.exports = {
    name: "GET/exec/democracy/edit",
    description: "Democracy - edit an article viewer",
    execute: async(event, verification) => {
        // user access levels
        if(["chair","admin"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        // retrieves the file
        const democracyPage = require("./democracyView")
        if(!event.queryStringParameters || !event.queryStringParameters.id){
            return await democracyPage.execute(event,verification);
        }
        let file = {}
        try {
            file = await getS3Item(config.buckets.operational, `democracy/${event.queryStringParameters.id}.json`);
            file = JSON.parse(file);
        } catch(err) {
            return await democracyPage.execute(event,verification);
        }

        let content = `<button onclick="history.back()" class="redirect-button">Go Back</button>
        <div style="text-align: left; margin: 0 auto; max-width: 800px;"><h2>Edit a Democracy Article</h2>
        <p>Note: you can not edit anything except the contents of the article. If you want to, contact the webmaster. The article is in markdown (<a href="https://www.markdownguide.org/basic-syntax/"  target="_blank">help on syntax</a>). If you are editting the standing orders, <a href="#" onclick="window.open('/exec/democracy/tool', '_blank', 'width=800,height=600'); return false;">here</a> is a helpful tool to convert a segment of TeX to markdown.
        The article, including the markdown, must only include alphanumeric characters, spaces, new lines, and the special symbols: -.,#\[\]\(\)_\/\*:'@~%£!\?‘’"\`;–“”+&\\ - up to a maximum of 1,000,000 characters</p>
        <p>
            <b>Title</b>: ${file.title || ""}<br>
            <b>First Published</b>: ${new Date(file.published * 1000).toLocaleString('en-GB', { timeZone: 'Europe/London' })}<br>
            <b>Last Edited</b>: ${new Date(file.edit * 1000).toLocaleString('en-GB', { timeZone: 'Europe/London' })}
        </p>
        <script src="https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.js"></script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.css">

        <form action="/exec/democracy/edit" method="post">
            <textarea id="editor" name="content">${file.markdownData}</textarea>
            <input name="article" type="hidden" value="${event.queryStringParameters.id}">
            <input type="submit" class="inputSubmit" value="Submit Changes">
        </form>

        <script>
            var simplemde = new SimpleMDE({ element: document.getElementById("editor") });
        </script>
        `

        content += `</div>`

        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Democracy Edit")
            .replace(/{{pageName}}/g, "Edit a Democracy Article")
            .replace(/{{pageDescriptor}}/g, "")
            .replace(/{{content}}/g,  content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}