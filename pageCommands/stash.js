const fs = require("fs");
const { loadDB } = require("../auxilliaryFunctions/stashStore");
const { isStashManager } = require("../auxilliaryFunctions/stashAuth");

// GET /stash - Storefront page
module.exports = {
    name: "GET/stash",
    description: "Stash - Merchandise storefront",
    execute: async(event, verification) => {
        const db = loadDB();
        
        // Generate product cards HTML
        let productsHtml = "";
        for (let product of db.products) {
            if (!product.active) continue;
            
            const imageHtml = product.imageUrl ? '<img src="' + product.imageUrl + '" alt="' + product.name + '" class="stash-product-image">' : '<div class="stash-product-image-placeholder">No Image</div>';
            const personalisationId = 'personalisation-' + product.id;
            
            let cardHtml = '<div class="stash-product-card" data-product-id="' + product.id + '">' +
                imageHtml +
                '<h3>' + product.name + '</h3>' +
                '<p>' + product.description + '</p>' +
                '<div class="variations">';
            
            for (let variation of product.variations) {
                if (!variation.active) continue;
                const price = (variation.price / 100).toFixed(2);
                const inStock = variation.stock > 0;
                const outOfStockClass = !inStock ? 'out-of-stock' : '';
                const disabledAttr = !inStock ? 'disabled' : '';
                const outOfStockText = !inStock ? ' (Out of Stock)' : '';
                
                cardHtml += '<button class="variation-btn ' + outOfStockClass + '" ' +
                    'data-variation-id="' + variation.id + '" ' +
                    'data-variation-label="' + variation.label + '" ' +
                    'data-variation-price="' + variation.price + '" ' +
                    'data-product-id="' + product.id + '" ' +
                    'data-product-name="' + product.name.replace(/"/g, '&quot;') + '" ' +
                    'data-product-personalisation="' + (product.personalisationAllowed ? 'true' : 'false') + '" ' +
                    'data-personalisation-price="' + product.personalisationPrice + '" ' +
                    disabledAttr + ' ' +
                    'onclick="selectVariation(\'' + product.id + '\', \'' + product.name.replace(/'/g, "\\'") + '\', \'' + variation.id + '\', \'' + variation.label + '\', ' + variation.price + ', ' + (product.personalisationAllowed ? 'true' : 'false') + ', ' + product.personalisationPrice + ')">' +
                    variation.label + ' - £' + price +
                    outOfStockText +
                    '</button>';
            }
            
            cardHtml += '</div>';
            
            // Show personalisation input if allowed
            if (product.personalisationAllowed) {
                const personalisationPrice = (product.personalisationPrice / 100).toFixed(2);
                cardHtml += '<div class="personalisation-section">' +
                    '<label for="' + personalisationId + '">Personalisation (optional): +£' + personalisationPrice + '</label>' +
                    '<input type="text" id="' + personalisationId + '" maxlength="4" placeholder="Max 4 chars (A-Z0-9)" class="personalisation-input" data-product-id="' + product.id + '">' +
                    '<small style="display: block; margin-top: 0.25rem; color: #666;">Letters A-Z and numbers 0-9 only</small>' +
                    '</div>';
            }
            
            cardHtml += '</div>';
            productsHtml += cardHtml;
        }
        
        // Check if store is open
        let bannerHtml = "";
        if (!db.settings.isOpen) {
            bannerHtml = `<div class="stash-banner stash-banner-closed">
                <strong>Store Closed</strong> - The merchandise store is currently closed. Browsing is still available, but checkout is disabled.
            </div>`;
        }
        
        // Build page content
        let content = `
            <style>
                .stash-container { max-width: 1200px; margin: 0 auto; }
                .stash-banner { padding: 1rem; margin-bottom: 2rem; border-radius: 4px; }
                .stash-banner-closed { background-color: #ffe6e6; color: #c00; }
                .stash-basket-summary { background: #f5f5f5; padding: 1.5rem; border-radius: 4px; margin-bottom: 2rem; }
                .stash-basket-summary h3 { margin-top: 0; }
                .stash-basket-summary button { margin-right: 0.5rem; }
                .stash-products { margin-top: 2rem; }
                .stash-products h2 { border-bottom: 2px solid #b1333a; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
                .stash-product-card { 
                    background: #f9f9f9; padding: 1.5rem; border-radius: 4px; margin-bottom: 1.5rem; 
                    border-left: 4px solid #b1333a; transition: box-shadow 0.2s;
                }
                .stash-product-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .stash-product-card h3 { margin-top: 0; color: #333; }
                .stash-product-card p { margin: 0.5rem 0; color: #666; font-size: 0.95rem; }
                .stash-product-image { max-width: 200px; max-height: 200px; border-radius: 4px; margin-bottom: 1rem; }
                .stash-product-image-placeholder { 
                    width: 200px; height: 200px; background: #ddd; border-radius: 4px; 
                    display: flex; align-items: center; justify-content: center; color: #999;
                    margin-bottom: 1rem; font-size: 0.9rem;
                }
                .variations { margin: 1rem 0; display: flex; flex-wrap: wrap; gap: 0.5rem; }
                .variation-btn { 
                    padding: 0.5rem 1rem; background: #b1333a; color: white; border: none; 
                    border-radius: 3px; cursor: pointer; font-size: 0.9rem; transition: background 0.2s;
                }
                .variation-btn:hover { background: #8a2629; }
                .variation-btn.out-of-stock { background: #ccc; cursor: not-allowed; }
                .personalisation-section { 
                    background: #fff; padding: 1rem; margin-top: 1rem; border-radius: 3px; 
                    border: 1px solid #ddd;
                }
                .personalisation-section label { display: block; margin-bottom: 0.5rem; font-weight: bold; color: #333; }
                .personalisation-input { 
                    width: 100%; max-width: 200px; padding: 0.5rem; border: 1px solid #ddd; 
                    border-radius: 3px; font-size: 0.95rem; text-transform: uppercase;
                }
                .personalisation-input::placeholder { text-transform: none; }
            </style>
            
            ${bannerHtml}
            
            <div class="stash-container">
                <div class="stash-basket-summary">
                    <h3>Your Basket <span id="basket-count">(0 items)</span></h3>
                    <button class="redirect-button" onclick="location.href='/stash/basket'">View Basket</button>
                    <button class="redirect-button" onclick="location.href='/'">Back to Home</button>
                </div>
                
                <div class="stash-products">
                    <h2>Available Products</h2>
                    ${productsHtml}
                </div>
            </div>
            
            <script>
                function selectVariation(productId, productName, variationId, variationLabel, variationPrice, personalisationAllowed, personalisationPrice) {
                    let personalisationText = "";
                    
                    // Convert string 'true'/'false' to boolean if needed
                    const allowPersonalisation = personalisationAllowed === true || personalisationAllowed === 'true';
                    
                    if (allowPersonalisation) {
                        const personalisationInput = document.getElementById('personalisation-' + productId);
                        if (personalisationInput) {
                            personalisationText = personalisationInput.value.trim().toUpperCase();
                            
                            if (personalisationText && !/^[A-Z0-9]{1,4}$/.test(personalisationText)) {
                                alert('Invalid personalisation. Must be 1-4 characters, A-Z0-9 only.');
                                return;
                            }
                        }
                    }
                    
                    addToBasket(productId, variationId, variationLabel, variationPrice, personalisationText, personalisationPrice);
                }
                
                function addToBasket(productId, variationId, variationLabel, variationPrice, personalisationText, personalisationPrice) {
                    let basket = JSON.parse(localStorage.getItem('stash_basket') || '[]');
                    
                    basket.push({
                        productId: productId,
                        variationId: variationId,
                        variationLabel: variationLabel,
                        variationPrice: variationPrice,
                        qty: 1,
                        personalisationText: personalisationText || "",
                        personalisationPrice: personalisationPrice || 0
                    });
                    
                    localStorage.setItem('stash_basket', JSON.stringify(basket));
                    updateBasketCount();
                    
                    // Clear personalisation input
                    const personalisationInput = document.getElementById('personalisation-' + productId);
                    if (personalisationInput) {
                        personalisationInput.value = "";
                    }
                    
                    alert('Item added to basket!');
                }
                
                function updateBasketCount() {
                    let basket = JSON.parse(localStorage.getItem('stash_basket') || '[]');
                    document.getElementById('basket-count').textContent = '(' + basket.length + ' items)';
                }
                
                // Update count on page load
                updateBasketCount();
            </script>
        `;
        
        // Render using generalPage template
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Merchandise")
            .replace(/{{pageName}}/g, "College Merchandise Store")
            .replace(/{{pageDescriptor}}/g, "Browse and purchase college merchandise")
            .replace(/{{managerLink}}/g, isStashManager(verification, db.settings) ? '<li><a href="/stash/manage">Merch Manager</a></li>' : '')
            .replace(/{{content}}/g, content);
        
        return{
            body: resp,
            headers: {"Content-Type": "text/html"}
        };
    }
};
