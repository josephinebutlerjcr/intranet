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
        try {
            file = await getS3Item(config.buckets.content, `democracy/${event.queryStringParameters.id}.pdf`);
        } catch(err) {
            return await democracyPage.execute(event,verification);
        }

        let minuteId = event.queryStringParameters.id;
        let time = minuteId.split("-")[0];
        let category = minuteId.split("-")[1];
        let year = minuteId.split("-")[2];
        let name = minuteId.split("-")[3];
        

        let content = `<button onclick="history.back()" class="redirect-button">Go Back</button>
        <div style="text-align: left; margin: 0 auto; max-width: 800px;"><h2>Edit a Democracy Article</h2>
        <p>Note: you can not edit anything except the contents of the article. If you want to, contact the webmaster (<a href=\"mailto:butlerwebmaster@durham.ac.uk\">butlerwebmaster@durham.ac.uk</a>).</p>
        <p>
            <b>Published on</b> ${new Date(time * 1000).toLocaleString('en-GB', { timeZone: 'Europe/London' })} <br>
            <b>Category</b> ${category} <br>
            <b>Academic Year</b> Starting on Michaelmas ${year} <br>
            <b>Title</b> ${name}
        </p>

        <form action="/exec/democracy/edit" method="post">
            <label for="pdfFile">Upload PDF (max 1.5 MB):</label>
            <input type="file" id="pdfFile" accept="application/pdf" required class="inputField">
            <input type="hidden" name="pdfDataUrl" id="pdfDataUrl" autocomplete="off">
            <input type="hidden" name="article" value="${minuteId}" autocomplete="off">
            <input type="submit" class="inputSubmit" value="Submit Changes">
        </form>

        <script>
            const fileInput = document.getElementById('pdfFile');
            const hiddenInput = document.getElementById('pdfDataUrl');
            const MAX_SIZE = 1536 * 1024;

            fileInput.addEventListener('change', () => {
                const file = fileInput.files[0];
                if (!file) return;
                if (file.type !== 'application/pdf') {
                    alert('Only PDF files are allowed.');
                    fileInput.value = '';
                    return;
                }
                if (file.size > MAX_SIZE) {
                    alert('File is too large. Max 1.5 MB allowed.');
                    fileInput.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    hiddenInput.value = e.target.result;
                };
                reader.readAsDataURL(file);
            });
        </script>`

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