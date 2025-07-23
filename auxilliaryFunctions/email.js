const { SESClient, SendEmailCommand  } = require("@aws-sdk/client-ses");

async function sendEmail(to,from,htmlBody,subject,replyTo){
    const client = new SESClient();
    let params = {
        Destination:{
            ToAddresses:[to]
        },
        Message:{
            Body:{
                Html:{
                    Charset:"UTF-8",
                    Data: htmlBody
                }
            },
            Subject:{
                Charset:"UTF-8",
                Data:subject
            }
        },
        Source:from
    }
    if(!!replyTo){
        params.ReplyToAddresses = [replyTo]
    }
    const command = new SendEmailCommand(params);

    try {
        let resp = await client.send(command);
        return{success:true}
    } catch (e) {
        return{success:false}
    }
}

module.exports = {sendEmail}