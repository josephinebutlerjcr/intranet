// College Check: based on the hashed DB

// preamble
const { getS3Item } = require("./s3")
const crypto=  require("crypto");
const config = require("../config.json")

// pepper
require("dotenv").config();
const pepper = process.env.PEPPER;

// function: main calling to validate
async function validateButlerCIS(cis){
    // retrieves from S3
    let table = [];
    try {
        let tmpHash = await getS3Item(config.buckets.operational, config.operationalLocations.collegeMembersHashedCisCodes);
        tmpHash = tmpHash.toString();
        table = tmpHash.replace(/\r/g,"").split("\n");
    } catch(err){
        console.log(err)
        return false;
    }

    // begins comparisons, one by one
    for(let line of table){
        let lineParts = line.trim().split(",");
        if(lineParts.length == 2){
            const hash = lineParts[0].split(":")[1].replace(/ /g,"");
            const salt = lineParts[1].split(":")[1].replace(/ /g,"");

            const comparisonHash = hashCIS(salt, cis, pepper);

            // match = true
            if(hash == comparisonHash){
                return true;
            }
        }
    }

    // no match
    return false;
}

// helper: hashes the CIS code
function hashCIS(salt, cis, pepper){
    let combinedString = `${salt}${cis}${pepper}`;
    return crypto.createHash("sha256").update(combinedString, "utf-8").digest("hex");
}

// export
module.exports = {validateButlerCIS}