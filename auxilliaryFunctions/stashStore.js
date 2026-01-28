const fs = require("fs");
const path = require("path");

const STASH_DB_PATH = path.join(__dirname, "../local_data/stash.json");

// Ensure local_data directory exists
function ensureDirectory() {
    const dir = path.dirname(STASH_DB_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Load stash DB from file
function loadDB() {
    ensureDirectory();
    
    if (!fs.existsSync(STASH_DB_PATH)) {
        return createDefaultDB();
    }
    
    try {
        const data = fs.readFileSync(STASH_DB_PATH, "utf8");
        return JSON.parse(data);
    } catch (err) {
        console.error("Error loading stash DB:", err);
        return createDefaultDB();
    }
}

// Save stash DB to file (atomic write)
function saveDB(db) {
    ensureDirectory();
    
    try {
        const tmpPath = STASH_DB_PATH + ".tmp";
        fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), "utf8");
        
        // Atomic rename
        if (fs.existsSync(STASH_DB_PATH)) {
            fs.unlinkSync(STASH_DB_PATH);
        }
        fs.renameSync(tmpPath, STASH_DB_PATH);
        return true;
    } catch (err) {
        console.error("Error saving stash DB:", err);
        return false;
    }
}

// Create default DB structure
function createDefaultDB() {
    const now = Math.floor(Date.now() / 1000);
    
    return {
        settings: {
            isOpen: true,
            bankDetails: {
                accountName: "Butler JCR Merchandise",
                sortCode: "00-00-00",
                accountNumber: "00000000",
                referenceHint: "ORDER-"
            },
            managerCisAllowlist: ["lvhx35"]
        },
        products: [
            {
                id: "prod_001",
                name: "College Hoodie",
                description: "Comfortable cotton-blend hoodie with college crest",
                imageUrl: "",
                active: true,
                personalisationAllowed: true,
                personalisationPrice: 3.50,
                variations: [
                    {
                        id: "var_001_xs",
                        label: "XS",
                        priceDelta: 0,
                        price: 25.00,
                        stock: 10,
                        active: true
                    },
                    {
                        id: "var_001_s",
                        label: "S",
                        priceDelta: 0,
                        price: 25.00,
                        stock: 15,
                        active: true
                    },
                    {
                        id: "var_001_m",
                        label: "M",
                        priceDelta: 0,
                        price: 25.00,
                        stock: 20,
                        active: true
                    },
                    {
                        id: "var_001_l",
                        label: "L",
                        priceDelta: 0,
                        price: 25.00,
                        stock: 15,
                        active: true
                    },
                    {
                        id: "var_001_xl",
                        label: "XL",
                        priceDelta: 0,
                        price: 25.00,
                        stock: 10,
                        active: true
                    }
                ]
            },
            {
                id: "prod_002",
                name: "College T-Shirt",
                description: "Classic t-shirt with college branding",
                imageUrl: "",
                active: true,
                personalisationAllowed: false,
                personalisationPrice: 0,
                variations: [
                    {
                        id: "var_002_s",
                        label: "S",
                        priceDelta: 0,
                        price: 12.00,
                        stock: 25,
                        active: true
                    },
                    {
                        id: "var_002_m",
                        label: "M",
                        priceDelta: 0,
                        price: 12.00,
                        stock: 30,
                        active: true
                    },
                    {
                        id: "var_002_l",
                        label: "L",
                        priceDelta: 0,
                        price: 12.00,
                        stock: 20,
                        active: true
                    }
                ]
            },
            {
                id: "prod_003",
                name: "College Mug",
                description: "Ceramic mug - perfect for hot drinks",
                imageUrl: "",
                active: true,
                personalisationAllowed: true,
                personalisationPrice: 2.00,
                variations: [
                    {
                        id: "var_003_std",
                        label: "Standard",
                        priceDelta: 0,
                        price: 8.50,
                        stock: 50,
                        active: true
                    }
                ]
            }
        ],
        orders: []
    };
}

module.exports = {
    loadDB,
    saveDB,
    ensureDirectory
};
