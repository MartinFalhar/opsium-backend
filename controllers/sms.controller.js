import fetch from "node-fetch";
import { getGoSmsToken } from "../services/gosmsToken.js";

export async function sendSMS(phone, text) {
  const token = await getGoSmsToken();

  const res = await fetch("https://app.gosms.eu/api/v1/messages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipients: [phone],
      message: text,
      channel: 484025, // SMS channel ID
      sender: "+420605829358", // musí být schválený sender
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  return res.json();
}