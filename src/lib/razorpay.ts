import Razorpay from "razorpay";

export function hasRazorpayCredentials() {
  return [process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET].some(
    (value) => Boolean(value?.trim() && !value.toLowerCase().includes("replace")),
  );
}

export function isSandboxPaymentsEnabled() {
  return process.env.NODE_ENV !== "production" && !hasRazorpayCredentials();
}

export function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (
    !keyId?.startsWith("rzp_test_") ||
    !keySecret ||
    keySecret.includes("replace")
  ) {
    return null;
  }

  return {
    client: new Razorpay({ key_id: keyId, key_secret: keySecret }),
    keyId,
  };
}
