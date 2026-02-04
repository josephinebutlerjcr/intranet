const fs = require("fs");
const { loadDB } = require("../auxilliaryFunctions/stashStore");
const { isStashManager } = require("../auxilliaryFunctions/stashAuth");

// GET /stash/basket - View basket (typically handled client-side, but provides fallback)
module.exports = {
    name: "GET/stash/basket",
    description: "Stash - Basket view",
    execute: async(event, verification) => {
        const db = loadDB();
        
        let content = `
            <style>
                .stash-basket-page { max-width: 900px; margin: 0 auto; }
                .stash-basket-page h2 { border-bottom: 2px solid #b1333a; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
                .stash-basket-page .redirect-button { 
                    background: #666; border: none; padding: 0.75rem 1.5rem; cursor: pointer;
                    border-radius: 3px; color: white; font-weight: normal; margin-bottom: 1.5rem; transition: background 0.2s;
                }
                .stash-basket-page .redirect-button:hover { background: #444; }
                .stash-table { width: 100%; border-collapse: collapse; background: white; margin: 1rem 0; }
                .stash-table th, .stash-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #ddd; }
                .stash-table th { background: #f5f5f5; font-weight: bold; }
                .stash-table tr:hover { background: #f9f9f9; }
                .small-btn { padding: 0.4rem 0.8rem; background: #b1333a; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.85rem; }
                .small-btn:hover { background: #8a2629; }
                .totals-box { background: #f9f9f9; padding: 1.5rem; border-radius: 4px; border-left: 4px solid #b1333a; margin: 2rem 0; }
                .totals-box p { margin: 0.5rem 0; font-size: 0.95rem; }
                .totals-box h3 { margin: 1rem 0 0 0; font-size: 1.3rem; }
                #basket-container { background: #f5f5f5; padding: 2rem; border-radius: 4px; text-align: center; }
                #checkout-section { margin-top: 1rem; }
                .checkout-actions { display: flex; gap: 1rem; margin-top: 1rem; flex-wrap: wrap; }
                .checkout-actions button { flex: 1; min-width: 200px; }
                .checkout-actions button[type="submit"] { background: #b1333a; }
                .checkout-actions button[type="submit"]:hover { background: #8a2629; }
            </style>
            
            <div class="stash-basket-page">
                <button class="redirect-button" onclick="location.href='/'">← Back to Home</button>
                
                <h2>Your Merchandise Basket</h2>
                
                <div id="basket-container">
                    <p>Loading your basket...</p>
                </div>
                
                <div id="checkout-section" style="display: none;">
                    <h3>Order Summary</h3>
                    <table class="stash-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Variation</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Personalisation</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="basket-items"></tbody>
                    </table>
                    
                    <div class="totals-box">
                        <p><strong>Subtotal:</strong> <span id="subtotal">£0.00</span></p>
                        <p><strong>Personalisation:</strong> <span id="personalisation">£0.00</span></p>
                        <h3>Total: <span id="total">£0.00</span></h3>
                    </div>
                    
                    <form id="checkout-form" method="POST" action="/stash/checkout" style="display: none;">
                        <input type="hidden" name="basket" id="basket-input">
                    </form>
                    
                    <div class="checkout-actions">
                        <button type="button" class="redirect-button" onclick="document.getElementById('checkout-form').submit();" ${!db.settings.isOpen ? 'disabled' : ''}>
                            ${db.settings.isOpen ? '✓ Proceed to Checkout' : 'Store is Closed'}
                        </button>
                        <button type="button" class="redirect-button" onclick="clearBasket()">Clear Basket</button>
                    </div>
                </div>
                
                <script>
                    function loadBasket() {
                        let basket = JSON.parse(localStorage.getItem('stash_basket') || '[]');
                        
                        if (basket.length === 0) {
                            document.getElementById('basket-container').innerHTML = '<p>Your basket is empty. <a href="/stash">Continue shopping →</a></p>';
                            return;
                        }
                        
                        document.getElementById('basket-container').style.display = 'none';
                        document.getElementById('checkout-section').style.display = 'block';
                        
                        let subtotal = 0;
                        let personalisation = 0;
                        let itemsHtml = '';
                        
                        basket.forEach((item, idx) => {
                            const unitPrice = item.variationPrice / 100;
                            const itemTotal = unitPrice;
                            subtotal += item.variationPrice;
                            
                            if (item.personalisationText) {
                                personalisation += (item.personalisationPrice || 0);
                            }
                            
                            itemsHtml += '<tr>' +
                                '<td>' + item.productId + '</td>' +
                                '<td>' + item.variationLabel + '</td>' +
                                '<td>1</td>' +
                                '<td>£' + unitPrice.toFixed(2) + '</td>' +
                                '<td>' + (item.personalisationText || '—') + '</td>' +
                                '<td><button type="button" class="small-btn" onclick="removeFromBasket(' + idx + ')">Remove</button></td>' +
                            '</tr>';
                        });
                        
                        document.getElementById('basket-items').innerHTML = itemsHtml;
                        document.getElementById('subtotal').textContent = '£' + (subtotal / 100).toFixed(2);
                        document.getElementById('personalisation').textContent = '£' + (personalisation / 100).toFixed(2);
                        document.getElementById('total').textContent = '£' + ((subtotal + personalisation) / 100).toFixed(2);
                        document.getElementById('basket-input').value = JSON.stringify(basket);
                    }
                    
                    function removeFromBasket(idx) {
                        let basket = JSON.parse(localStorage.getItem('stash_basket') || '[]');
                        basket.splice(idx, 1);
                        localStorage.setItem('stash_basket', JSON.stringify(basket));
                        loadBasket();
                    }
                    
                    function clearBasket() {
                        if (confirm('Clear your entire basket?')) {
                            localStorage.removeItem('stash_basket');
                            location.reload();
                        }
                    }
                    
                    loadBasket();
                </script>
            </div>
        `;
        
        // Render using generalPage template
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Basket")
            .replace(/{{pageName}}/g, "Your Merchandise Basket")
            .replace(/{{pageDescriptor}}/g, "Review and checkout your order")
            .replace(/{{managerLink}}/g, isStashManager(verification, db.settings) ? '<li><a href="/stash/manage">Merch Manager</a></li>' : '')
            .replace(/{{content}}/g, content);
        
        return{
            body: resp,
            headers: {"Content-Type": "text/html"}
        };
    }
};
