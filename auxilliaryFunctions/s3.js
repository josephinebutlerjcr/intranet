const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { Buffer } = require("buffer");

async function uploadImageJpeg(bucket, key, content){
    const s3 = new S3Client();
    const imageBuffer = Buffer.from(content, "base64");

    const parameters = {
        Bucket: bucket,
        Key: key,
        Body: imageBuffer,
        ContentType: "image/jpeg"
    };

    try {
        const result = await s3.send(new PutObjectCommand(parameters));
        return true;
    } catch(err) {
        return false;
    }
}

async function getS3Item(bucket,key){
    const client = new S3Client();
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    let resp = await client.send(command);
    const bodyContents = await streamToString(resp.Body);
    return bodyContents;
}

async function putS3Item(content,bucket,key){
    const client = new S3Client();

    let parameters = {
        Body:content,
        Bucket:bucket,
        Key:key
    }

    let command = new PutObjectCommand(parameters)
    let response = await client.send(command);

    return
}
async function streamToString(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
}

const { ListObjectsV2Command } = require("@aws-sdk/client-s3");

async function listDirectoryFiles(bucketName, prefix) {
    const s3 = new S3Client({ region: "eu-west-2" });

    let list = [];

    try {
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix,
            Delimiter: "/"
        });

        const response = await s3.send(command);

        if (response.Contents) {
            response.Contents.forEach((item) => {
                const key = item.Key;
                const parts = key.split("/");
                const filename = parts[parts.length - 1];
                if (filename) {
                    const nameWithoutExt = filename.split(".")[0];
                    list.push(nameWithoutExt);
                }
            });
        }
    } catch (err) {
        console.error("Error listing directory files:", err);
    }

    return list;
}

module.exports = {uploadImageJpeg,getS3Item,putS3Item,listDirectoryFiles}
