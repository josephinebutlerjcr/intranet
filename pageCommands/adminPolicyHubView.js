const fs = require("fs");
const { getS3Item } = require("../auxilliaryFunctions/s3");
const config = require("../config.json")

module.exports = {
    name: "GET/admin/policy",
    description: "Admin - policy hub",
    execute: async(event, verification) => {
        // user access levels
        if(["admin"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }


        let content = `<button onclick="history.back()" class="redirect-button">Go Back</button><div style="text-align: left; margin: 0 auto; max-width: 800px;"><h2>Upload Policy</h2>

        <p>Policies can be viewed on the public-facing website at <a href="https://www.butlerjcr.com/policy">https://www.butlerjcr.com/policy</a></p>

        <p><b>Warning:</b> Ensure the policy number you provide in the form is the policy number. The old copy with that number will be overwritten. If, for some reason, a policy number is no longer in use, please upload a document which says "Not In Use" - perhaps if you merged policies, just give a brief note to say it has been merged to that.</p>

        <form action="/admin/policy" method="post">

            <label>Policy Number (omit the P and leading 0s, e.g. P/001 turns to 1, or P/016 turns to 16)</label>
            <input type="number" placeholder="Policy Number, e.g. 20" name="number" class="inputField" required autocomplete="off">

            <label>Name of Policy</label>
            <input type="text" name="name" placeholder="Policy Name, e.g. Conflict of Interest" class="inputField" required autocomplete="off">

            <label>Lapse Month and Year</label>
            <input type="text" name="lapse" class="inputField" placeholder="Lapse Month, e.g. February 2027" required autocomplete="off">

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
            .replace(/{{pageNameShort}}/g, "Policy Hub")
            .replace(/{{pageName}}/g, "Policy Hub")
            .replace(/{{pageDescriptor}}/g, "")
            .replace(/{{content}}/g,  content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}