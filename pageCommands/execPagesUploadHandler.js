const fs = require("fs");
const config = require("../config.json")
const { getItem, putItem } = require("../auxilliaryFunctions/dynamodb")
const { parseBody, getTime } = require("../auxilliaryFunctions/formatting")
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getS3Item, putS3Item } = require("../auxilliaryFunctions/s3");
const s3Client = new S3Client();

// main
module.exports = {
    name: "POST/exec/pages/upload",
    description: "Exec's Page Uploader Handler",
    execute: async(event, verification) => {
        const inputBody = JSON.parse(event.body);

        // user access levels
        if(["chair","admin","exec"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return {
                body:JSON.stringify({
                    success:false,
                    msg:"Unauthorised"
                }),
                headers:{"Content-Type":"application/json"}
            }
        }

        // validation
        // presence check
        if(!inputBody.destination || !inputBody.fileName || !inputBody.imageStream){
            return {
                body:JSON.stringify({
                    success:false,
                    msg:"Missing Parameters"
                }),
                headers:{"Content-Type":"application/json"}
            }
        }

        // format valudation
        if(!/^[a-z0-9]{1,12}$/.test(inputBody.destination)){
            return {
                body:JSON.stringify({
                    success:false,
                    msg:"Invalid Destination"
                }),
                headers:{"Content-Type":"application/json"}
            }
        }
        if(!/^[^\\\/:\*\?"<>\|]+\.(png|jpg|jpeg)$/i.test(inputBody.fileName)){
            return {
                body:JSON.stringify({
                    success:false,
                    msg:"Invalid File Name - maybe because it is not a png, jpg, or jpeg?"
                }),
                headers:{"Content-Type":"application/json"}
            }
        }
        if(!/^data:image\/(jpeg|jpg|png);base64,[A-Za-z0-9\+\/]+={0,2}$/.test(inputBody.imageStream)){
            return {
                body:JSON.stringify({
                    success:false,
                    msg:"Invalid Image Stream - maybe because it is not a png, jpg, or jpeg?"
                }),
                headers:{"Content-Type":"application/json"}
            }
        }
        
        // length checks
        if(inputBody.fileName.length > 64){
            return {
                body:JSON.stringify({
                    success:false,
                    msg:"File name too long - exceeds 64 characters"
                }),
                headers:{"Content-Type":"application/json"}
            }
        }

        const maxFileSize = 5*1024*1024;
        if(getBase64ImageSizeInBytes(inputBody.imageStream) > maxFileSize){
            return {
                body:JSON.stringify({
                    success:false,
                    msg:"Image exceeds 5MB"
                }),
                headers:{"Content-Type":"application/json"}
            }
        }

        // happy days - upload
        // image extractor
        const mimeTypeMatch = inputBody.imageStream.match(/^data:(image\/(jpeg|jpg|png));base64,/);
        const base64Content = inputBody.imageStream.split(",")[1];
        const contentType = mimeTypeMatch ? mimeTypeMatch[1] : "application/octet-stream";
        const fileBuffer = Buffer.from(base64Content, "base64");

        // target key
        const targetKey = `0-intranetuploads/${inputBody.destination.trim()}/${inputBody.fileName.trim()}`.trim();

        // upload
        try {
            const putCommand = new PutObjectCommand({
                Bucket: config.buckets.content,
                Key: targetKey,
                Body: fileBuffer,
                ContentType: contentType
            });
            await s3Client.send(putCommand);
        } catch(err) {
            console.log(err)
            return {
                body:JSON.stringify({
                    success:false,
                    msg:"Internal Server Error"
                }),
                headers:{"Content-Type":"application/json"}
            }
        }

        // logs
        let logBook = []
        try {
            logBook = await getS3Item(config.buckets.operational,`logs/operational/imageUploads.json`)
            logBook = JSON.parse(logBook);
        } catch(err){
            logBook = [];
        }
        logBook.push({
            time: getTime(),
            person: verification.cis,
            notes:[`File uploaded to ${targetKey}`]
        })
        try {
            await putS3Item(JSON.stringify(logBook),config.buckets.operational, `logs/operational/imageUploads.json`)
        } catch(err){}

        // return
        return {
            body:JSON.stringify({
                success:true,
                msg:`Uploaded to: https://${config.buckets.content}.s3.eu-west-2.amazonaws.com/${targetKey}`
            }),
            headers:{"Content-Type":"application/json"}
        }
    }
}

// file size check (courtesy of gemini)
function getBase64ImageSizeInBytes(dataUrlString) {
    const base64Marker = ";base64,";
    const markerIndex = dataUrlString.indexOf(base64Marker);
    if (markerIndex === -1) return 0;
    
    const base64Content = dataUrlString.substring(markerIndex + base64Marker.length);
    
    let padding = 0;
    if (base64Content.endsWith("==")) padding = 2;
    else if (base64Content.endsWith("=")) padding = 1;
    
    return (base64Content.length * 3 / 4) - padding;
}