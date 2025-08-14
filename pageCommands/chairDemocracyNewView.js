const fs = require("fs");
const { getS3Item } = require("../auxilliaryFunctions/s3");
const config = require("../config.json")

module.exports = {
    name: "GET/exec/democracy/new",
    description: "Democracy - new minute",
    execute: async(event, verification) => {
        // user access levels
        if(["chair","admin"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }


        let content = `<button onclick="history.back()" class="redirect-button">Go Back</button><div style="text-align: left; margin: 0 auto; max-width: 800px;"><h2>Create a Meeting Minute</h2>
        <p>The minute must be in markdown (<a href="https://www.markdownguide.org/basic-syntax/"  target="_blank">help on syntax</a>).
        The article, including the markdown, must only include alphanumeric characters, spaces, new lines, and the special symbols: -.,#\[\]\(\)_\/\*:'@~%£!\?‘’"\`;–“”+&\\ - up to a maximum of 1,000,000 characters.
        The title must be 1 to 32 characters, A-Z a-z 0-9, spaces, and special symbols: '-:,.</p>
        <br>Warning: you are unable to edit the name of, or delete the minute after published. If you want to do so, you must contact the webmaster.

        <script src="https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.js"></script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.css">

        <form action="/exec/democracy/new" method="post">
            <input type="name" placeholder="Minute Title" name="title" class="inputField">
            <textarea id="editor" name="content"></textarea>
            <input type="submit" class="inputSubmit" value="Create">
        </form>

        <script>
            var simplemde = new SimpleMDE({ element: document.getElementById("editor") });
        </script>
        `

        content += `</div>`

        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Democracy New")
            .replace(/{{pageName}}/g, "Create a Minute")
            .replace(/{{pageDescriptor}}/g, "")
            .replace(/{{content}}/g,  content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}