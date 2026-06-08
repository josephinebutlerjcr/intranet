const fs = require("fs");
const config = require("../config.json")
const { getS3Item } = require("../auxilliaryFunctions/s3")

// editable pages. IF YOU WANT TO ADD NEW PAGES, YOU MUST IMPLEMENT IT ON THE PUBLIC WEBSITE AS WELL AS ADDING IT BELOW:
const pages = ["welfare","freshers","college","contact","events","stash","acknowledgements"]
// YOU MUST ALSO UPDATE THIS IN THE execPagesHandler.js FILE TOO!

// main
module.exports = {
    name: "GET/exec/pages",
    description: "Edit Web Pages",
    execute: async(event, verification) => {
        // user access levels
        if(["chair","admin","exec"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        // querystring
        let inputQuery = ""
        if(!!event.queryStringParameters){
            if(!!event.queryStringParameters.id){
                inputQuery = event.queryStringParameters.id;
            }
        }

        // content
        let subcontent = "";
        if(!inputQuery || pages.includes(inputQuery) == false){
            // no input query so just a general
            subcontent = `<p>Please select a page</p><ul>`
            for(i in pages){
                subcontent += `<li><a href="?id=${pages[i]}">${pages[i]}</a></li>`
            }
            subcontent += "</li>"
        } else {
            // if it is a particular page
            // retrieve the markdown
            let inputMarkdown = "";
            try {
                let tmpHash = await getS3Item(config.buckets.operational, `pages/${inputQuery}.md`);
                inputMarkdown = tmpHash.toString();
            } catch(err){
                console.log(err)
                inputMarkdown = "**ERROR RETRIEVING THE CONTENTS OF THE WEBPAGE. PLEASE DO NOT SUBMIT THIS. PLEASE TRY AGAIN**"
            }

            // the page as viewed to the user.
            subcontent += `<blockquote>You are editing: ${inputQuery}. <a href="?">Go Back</a></blockquote>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.css"><script src="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js"></script>
            
            <button onclick="uploaderWindow()" class="redirect-button">View & Upload Images</button>
            
            <form action="/exec/pages" method="post">            
                <textarea id="editor" name="editor">${inputMarkdown}</textarea>

                <label id="declaration">I, ${verification.cis}, can declare that I am authorised to edit this page by my exec responsibility, or by the exec mandate, and can confirm that the information I am providing is truly accurate, does not breach any laws, does not breach any JCR policies, or cause offense to members of the public. I understand that the changes are logged against my username.</label>
                <select class="inputField" name="declaration" id="declaration">
                    <option value="no">-</option>
                    <option value="yes">I confirm my declaration for the above statement.</option>
                </select>

                <input type="hidden" name="page" value="${inputQuery}" readonly>

                <input type="submit" class="inputSubmit" value="Submit Changes">
            </form>
            <script>
            const easymde = new EasyMDE({
                element: document.getElementById("editor"),
            });
            </script>`
        }


        let content = 
        `<button class="redirect-button" onclick="location.href='/'">Back to Dashboard</button> |
        <button class="redirect-button" onclick="location.href='/exec'">Executive's Dashboard</button>
        
        <section style="display: flex; justify-content: center;">
            <section class="latest-news" style="padding: 3rem 1rem; max-width: 900px; text-align: left;">
                <h2 style="text-align: center;">Pages</h2>
                <p>Please read the manual before making any changes.</p>
                ${subcontent}
            </section>
        </section>

        <script>
            function uploaderWindow(url) {
                const width = 600;
                const height = 700;
                const left = (screen.width / 2) - (width / 2);
                const top = (screen.height / 2) - (height / 2);
                const windowFeatures = \`width=\${width},height=\${height},top=\${top},left=\${left},resizable=yes,scrollbars=yes\`;
                    window.open("/exec/pages/upload", 'S3FileWindow', windowFeatures);
            }
        </script>`
                
        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Pages")
            .replace(/{{pageName}}/g, "Public Pages Editor")
            .replace(/{{pageDescriptor}}/g, "")
            .replace(/{{content}}/g, content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}