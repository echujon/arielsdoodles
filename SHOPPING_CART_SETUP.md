# Shopping Cart Setup Guide

This guide will help you set up the shopping cart feature for Ariel's Doodles with Stripe integration.

## Architecture Overview

The shopping cart uses a **client-side** approach for better performance and cost efficiency:

- **Cart Management**: Happens entirely in the browser using localStorage (no server calls)
- **Product Data**: Stored in Hugo markdown files (`/content/shop/*.md`)
- **Checkout**: Cloudflare Worker creates Stripe checkout sessions
- **Payments**: Handled by Stripe Checkout

```
┌─────────────────┐
│  Hugo Site      │
│  (Client-Side)  │
│  - Cart in      │
│    localStorage │
│  - Product data │
│    from markdown│
└────────┬────────┘
         │
         │ (Only for checkout)
         ▼
┌─────────────────┐
│ Cloudflare      │
│ Worker          │
│ - Creates       │
│   Stripe        │
│   session       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Stripe Checkout │
│ - Payment       │
│ - Shipping      │
└─────────────────┘
```

## Prerequisites

1. Stripe account (test mode for development)
2. Cloudflare account (free tier works)
3. Node.js and npm installed
4. Hugo installed

## Step 1: Create Stripe Products and Prices

### Option A: Via Stripe Dashboard (Recommended)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Click "Add Product"
3. Fill in product details:
   - **Name**: "Print" (or your product name)
   - **Description**: Product description (optional)
   - **Pricing**: Standard pricing
   - **Price**: $20.00 USD (or your price)
   - **Billing**: One time
4. Click "Save product"
5. **Important**: Copy the following IDs from the product page:
   - **Product ID**: Starts with `prod_` (e.g., `prod_ABC123xyz`)
   - **Price ID**: Starts with `price_` (e.g., `price_XYZ789abc`)

### Option B: Via Stripe CLI/API

```bash
# Create product
stripe products create \
  --name="Print" \
  --description="Beautiful art print"

# Note the product ID from the response (prod_xxx)

# Create price
stripe prices create \
  --product=prod_xxx \
  --unit-amount=2000 \
  --currency=usd

# Note the price ID from the response (price_yyy)
```

## Step 2: Update Product Markdown Files

Add the Stripe IDs to your product markdown files in `/content/shop/`:

### Example: `/content/shop/print.md`

```yaml
---
title: "Print"
date: 2023-09-12T23:14:32-06:00
id: print
layout: item
draft: false
price: 20
image: "/images/gallery/fulls/commissions/pets/Alaska.png"
productId: "prod_ABC123xyz"    # Add this - from Stripe
priceId: "price_XYZ789abc"     # Add this - from Stripe
---

Optional product description here...
```

### Important Notes:

- `price`: Keep this in **dollars** (e.g., `20` for $20.00)
- `productId`: Must match your Stripe product ID
- `priceId`: Must match your Stripe price ID
- If `productId` and `priceId` are missing, the legacy "Buy Now" button will show instead

## Step 3: Deploy the Cloudflare Worker

### 1. Navigate to the worker directory:

```bash
cd arielsdoodles-cart
```

### 2. Install dependencies:

```bash
npm install
```

### 3. Create `.dev.vars` file for local development:

```bash
cp .dev.vars.example .dev.vars
```

### 4. Edit `.dev.vars` and add your Stripe test key:

```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
```

### 5. Test locally:

```bash
npm run dev
```

The worker will run at `http://localhost:8787`

### 6. Deploy to Cloudflare:

```bash
# Login to Cloudflare (first time only)
npx wrangler login

# Deploy
npm run deploy
```

### 7. Set production secrets:

```bash
wrangler secret put STRIPE_SECRET_KEY
# Paste your LIVE Stripe secret key when prompted
# For production, use sk_live_xxx instead of sk_test_xxx
```

### 8. Note your worker URL:

After deployment, you'll see a URL like:
```
https://arielsdoodles-cart.YOUR_SUBDOMAIN.workers.dev
```

## Step 4: Update Hugo Configuration

Update your production config file at `/config/production/config.toml`:

```toml
[Params]
  # ... other params ...
  cartWorkerURL = "https://arielsdoodles-cart.YOUR_SUBDOMAIN.workers.dev"
```

Replace `YOUR_SUBDOMAIN` with your actual Cloudflare subdomain.

## Step 5: Test the Cart

### Local Testing:

1. Start Hugo dev server:
   ```bash
   hugo server
   ```

2. Start the worker (in another terminal):
   ```bash
   cd arielsdoodles-cart
   npm run dev
   ```

3. Visit `http://localhost:1313/shop`
4. Click "Add to Cart" on a product
5. Click the cart icon in the header
6. Click "Proceed to Checkout"
7. You should be redirected to Stripe test checkout

### Test Cards:

Use these test card numbers in Stripe checkout:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Use any future expiration date, any 3-digit CVC, and any billing ZIP code.

## Step 6: Production Deployment

### 1. Update Worker Secrets:

```bash
# Switch to production Stripe key
wrangler secret put STRIPE_SECRET_KEY
# Paste your sk_live_xxx key
```

### 2. Update Hugo Config:

In `/config/production/config.toml`:

```toml
cartWorkerURL = "https://arielsdoodles-cart.YOUR_ACTUAL_SUBDOMAIN.workers.dev"
```

### 3. Update Product Prices:

In Stripe Dashboard, switch from "Test mode" to "Live mode" and:
1. Recreate your products in live mode
2. Update your markdown files with **live mode** product/price IDs

### 4. Deploy Hugo Site:

```bash
hugo
# Then deploy to Netlify (automatic via git push)
```

## Customization

### Adding Shipping Rates

1. Create shipping rates in [Stripe Dashboard](https://dashboard.stripe.com/test/shipping-rates)
2. Note the shipping rate IDs (starts with `shr_`)
3. Update `/arielsdoodles-cart/src/index.js`:

```javascript
shipping_options: [
  { shipping_rate: 'shr_your_standard_shipping_id' },
  { shipping_rate: 'shr_your_express_shipping_id' },
],
```

### Changing Allowed Countries

Edit `/arielsdoodles-cart/src/index.js`:

```javascript
shipping_address_collection: {
  allowed_countries: ['US', 'CA', 'GB', 'AU'], // Add more country codes
},
```

### Customizing Cart UI

- **Colors**: Edit `/static/css/cart.css`
- **Layout**: Edit `/layouts/partials/cartModal.html`
- **Behavior**: Edit `/static/js/cart.js`

## Troubleshooting

### "Cart is loading" alert when adding items

**Cause**: Cart JavaScript hasn't loaded yet

**Solution**: Hard refresh the page (Cmd+Shift+R or Ctrl+Shift+R)

### "Add to Cart" button doesn't appear

**Cause**: Missing `productId` or `priceId` in product markdown

**Solution**: Add both IDs to the frontmatter (see Step 2)

### Checkout fails with "Invalid price ID"

**Cause**: Mismatch between test/live mode

**Solution**: Ensure your worker is using the same Stripe key mode (test vs live) as your price IDs

### Cart icon doesn't show

**Cause**: CSS not loaded

**Solution**: Check that `/static/css/cart.css` exists and is referenced in config

### Worker deployment fails

**Cause**: Not logged into Cloudflare

**Solution**: Run `npx wrangler login` first

## Security Notes

- Cart data is stored in localStorage (client-side only)
- Prices are validated by Stripe during checkout
- Never expose Stripe secret keys in frontend code
- The worker only creates checkout sessions with user-provided price IDs (which Stripe validates)

## Support

For issues with:
- **Stripe**: [Stripe Support](https://support.stripe.com/)
- **Cloudflare Workers**: [Cloudflare Docs](https://developers.cloudflare.com/workers/)
- **Hugo**: [Hugo Docs](https://gohugo.io/documentation/)

## Next Steps

1. Set up Stripe webhooks (optional) - for order notifications
2. Add product images to cart display
3. Implement discount codes (Stripe native support)
4. Add inventory tracking in Stripe
