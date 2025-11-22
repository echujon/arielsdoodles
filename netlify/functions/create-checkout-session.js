const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
    try {
      const { title, price } = JSON.parse(event.body); // Receive title and price from the frontend
  
      // Convert price to cents as Stripe expects amounts in the smallest currency unit
      const amountInCents = Math.round(price * 100);
  
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd', // Set the currency you want to use
              product_data: {
                name: title,
              },
              unit_amount: amountInCents, // Price in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.URL}/shop?success`,
        cancel_url: `${process.env.URL}/shop?cancel`,
      });
  
      return {
        statusCode: 200,
        body: JSON.stringify({ id: session.id }),
      };
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: error.message }),
      };
    }
  };
