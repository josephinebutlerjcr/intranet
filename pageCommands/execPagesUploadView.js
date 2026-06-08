const fs = require("fs");
const config = require("../config.json")
const { getS3Item } = require("../auxilliaryFunctions/s3");
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const s3Client = new S3Client();

// main
module.exports = {
    name: "GET/exec/pages/upload",
    description: "Upload Images",
    execute: async(event, verification) => {
        // user access levels
        if(["chair","admin","exec"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        // querystring
        let inputQuery = ""
        if(!!event.queryStringParameters){
            if(!!event.queryStringParameters.opt){
                inputQuery = event.queryStringParameters.opt;
            }
        }

        // for option files
        if(inputQuery == "files"){
            let resp = [];
            try {
                const listParams = {
                    Bucket: config.buckets.content,
                };

                let isTruncated = true;
                let continuationToken = null;
                const allItems = [];

                // continuous data feed - to populate full bucket
                while (isTruncated) {
                    if (continuationToken) {
                        listParams.ContinuationToken = continuationToken;
                    }

                    const data = await s3Client.send(new ListObjectsV2Command(listParams));
                    
                    if (data.Contents) {
                        allItems.push(...data.Contents);
                    }

                    isTruncated = data.IsTruncated;
                    continuationToken = data.NextContinuationToken;
                }

                // filtered and mapped
                resp = allItems
                    .filter(item => {
                        // filters for jp(e)g and png only
                        if (!item.Key) return false;
                        const lowerKey = item.Key.toLowerCase();
                        return lowerKey.endsWith(".jpg") || lowerKey.endsWith(".jpeg") || lowerKey.endsWith(".png");
                    })
                    .filter(item => {
                        // EXCLUDES the avatars and student group logos
                        if (!item.Key) return false;
                        const lowerKey = item.Key.toLowerCase();
                        return !(lowerKey.startsWith("avatars/") || lowerKey.startsWith("societylogo/"));
                    })
                    .map(item => {
                        return {
                            key: item.Key,
                            size: (item.Size / 1024).toFixed(2) + " KB",
                            lastModified: item.LastModified,
                            url: `https://${config.buckets.content}.s3.eu-west-2.amazonaws.com/${item.Key}`
                        };
                    });

            } catch (err) {
                console.error("Error fetching or processing S3 objects:", err);
            }

            return {
                body: JSON.stringify(resp),
                headers: { "Content-Type": "application/json" }
            };
        }

                
        // sending it to the user
        let resp = fs.readFileSync("./assets/html/upload.html").toString()

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}