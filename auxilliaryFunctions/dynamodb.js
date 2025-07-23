// export
module.exports = {
    getItem,putItem,scanItems
};

//premble
const { DynamoDBClient, GetItemCommand, PutItemCommand, ScanCommand  } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

// stuff
async function getItem(table,key){
    const client = new DynamoDBClient();

    let parameters = {
        TableName: table,
        Key:marshall(key)
    }

    const command = new GetItemCommand(parameters)
    const response = await client.send(command);

    if(response.$metadata.httpStatusCode == 200){
        if(!!response.Item){
            return unmarshall(response.Item)
        } else if(!!response.Items) {
            return unmarshall(response.Items)
        } else {
            return {error:true,msg:"noData"}
        }
    } else {
        return {error:true,msg:"error"}
    }
}

async function putItem(table,item){
    const client = new DynamoDBClient();

    let parameters = {
        TableName: table,
        Item:marshall(item,{ removeUndefinedValues: true })
    }

    let command = new PutItemCommand(parameters)
    let response = await client.send(command);

    return (response.$metadata.httpStatusCode == 200)
}

async function scanItems(table,filterExp,expressionVals,expressionNames){
    const client = new DynamoDBClient();

    let stillFinding = true;
    let itemsRtn = [];
    let lastKey = "";

    let parameters = {
        TableName: table,
        FilterExpression: filterExp
    }
    if(!!expressionVals){
        parameters.ExpressionAttributeValues = marshall(expressionVals)
    }
    if(!!expressionNames){
        parameters.ExpressionAttributeNames = expressionNames
    }

    while(stillFinding){
        if(lastKey != ""){
            parameters.LastEvaluatedKey = lastKey;
        }
    
        let command = new ScanCommand(parameters)
        let response = await client.send(command);
    
        if(response.$metadata.httpStatusCode == 200){
            if(response.Count == 0){
                return [];
            }
            for(var i = 0; i < response.Items.length; i++){
                itemsRtn.push(unmarshall(response.Items[i]))
            }

            if(!!response.LastEvaluatedKey){
                lastKey = response.LastEvaluatedKey;
            } else {
                stillFinding = false
            }

        } else {
            stillFinding = false;
        }
    }

    if(itemsRtn.length == 0){
        return []
    } else {
        return itemsRtn
    }
}