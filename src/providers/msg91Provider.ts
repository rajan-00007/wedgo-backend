import axios from "axios";
import logger from "../utils/logger";

export const msg91Provider = {

  async send(phone: string, message: string, data?: any) {
    logger.info(`[MSG91 PROVIDER] Attempting to send OTP to ${phone} at ${new Date().toISOString()}`);
    const authKey = process.env.MSG91_AUTH_KEY?.trim();
    const extractedOtp = data?.otp || message.match(/\d{4,6}/)?.[0] || "";

    const payload = {
      template_id: process.env.MSG91_TEMPLATE_ID,
      sender: process.env.MSG91_SENDER_ID || "HHHHHH",
      short_url: "0",
      mobiles: phone.replace("+", ""),
      var: extractedOtp,
      otp: extractedOtp
    };

    const headers = {
      authkey: authKey,
      "Content-Type": "application/json"
    };

    const makeRequest = async () => {
      return await axios.post("https://api.msg91.com/api/v5/flow/", payload, { headers });
    };

    try {
      let response = await makeRequest();

      if (response.data?.type === "error" || response.status >= 400) {
        logger.error(`[MSG91 Provider] Primary attempt failed: ${JSON.stringify(response.data)}`);
        logger.info(`[MSG91 Provider] Using Fallback... Retrying with MSG91 again.`);

        response = await makeRequest();

        if (response.data?.type === "error" || response.status >= 400) {
          logger.error(`[MSG91 Provider] Fallback attempt also failed: ${JSON.stringify(response.data)}`);
          throw new Error(`MSG91 fallback failed: ${JSON.stringify(response.data)}`);
        }
      }

      logger.info(`[MSG91 Provider] API Response: ${JSON.stringify(response.data)}`);
      return response.data;

    } catch (error: any) {
      logger.error(`[MSG91 Provider] Exception during primary attempt: ${error.message}`);
      logger.info(`[MSG91 Provider] Using Fallback... Retrying with MSG91 again.`);

      try {
        const response = await makeRequest();

        if (response.data?.type === "error" || response.status >= 400) {
          throw new Error(`MSG91 fallback failed: ${JSON.stringify(response.data)}`);
        }

        logger.info(`[MSG91 Provider] Fallback API Response: ${JSON.stringify(response.data)}`);
        return response.data;
      } catch (fallbackError: any) {
        logger.error(`[MSG91 Provider] Fallback attempt also failed with exception: ${fallbackError.message}`);
        throw fallbackError;
      }
    }
  }

};
