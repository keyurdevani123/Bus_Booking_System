const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const paymentStore = require("../db/store");
const PendingPayment = require("../model/PendingPayment");
const { addBooking } = require("./bookingController");
const Bus = require("../model/Bus");
const convertTimeToFloat = require("../utils/convertTimeToFloat");
const stripeControllerFunction = async (req, res) => {
  const payload = req.rawBody;

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log(err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    console.log("metadata", event.data.object.metadata);
    const tempBookId = event.data.object.metadata.tempBookId;
    // Try memory first, then fall back to MongoDB
    let paymentDetails = paymentStore[tempBookId];
    if (!paymentDetails) {
      const pending = await PendingPayment.findOne({ tempBookId }).lean();
      if (pending) paymentDetails = pending.data;
    }
    if (paymentDetails) {
      console.log("paymentDetails", paymentDetails);
      try {
        await addBooking(paymentDetails, tempBookId);
        delete paymentStore[tempBookId];
      } catch (err) {
        console.error("Webhook: addBooking failed for", tempBookId, err.message);
      }
    } else {
      console.log("Webhook: payment already confirmed or expired for", tempBookId);
    }
  }

  return res.json({ received: true });
};

module.exports = { stripeControllerFunction };
