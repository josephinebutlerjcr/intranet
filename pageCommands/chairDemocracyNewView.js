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

        <form action="/exec/democracy/new" method="post">

            <label>Title of Minute, e.g. "01/10/2024" (only 1-32 characters, A-Z a-z 0-9 '-:,./ and spaces only)</label>
            <input type="name" placeholder="Minute Title" name="title" class="inputField" required autocomplete="off">

            <label>Category</label>
            <select name="category" class="inputField" required>
                <option value="jcr">JCR Meeting</option>
                <option value="welfare">Welfare Meeting</option>
                <option value="other">Other Meeting</option>
            </select>

            <label>Year (start of academic year, e.g. February 2025 --> 2024)</label>
            <input type="number" name="year" class="inputField" required autocomplete="off">

            <label for="pdfFile">Upload PDF (max 1.5 MB):</label>
            <input type="file" id="pdfFile" accept="application/pdf" required class="inputField">
            <input type="hidden" name="pdfDataUrl" id="pdfDataUrl" autocomplete="off">

            <input type="submit" class="inputSubmit" value="Create">
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