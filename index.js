// Agregar al inicio:
const express = require('express');
const axios = require('axios');
// agrega cualquier otra importación que uses, por ejemplo tus funciones getTokenData/getDexData...
const app = express();
app.use(express.json());

// Tus funciones y lógica aquí
function abreviarNumero(num) {
  num = Number(num);
  if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toString();
}

// Tu endpoint
app.post("/webhook", async (req, res) => {
  const body = req.body;
  const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0] || null;

  if (message && message.text) {
    const chatId = message.from;
    const contract = message.text.body.trim();

    try {
      const tokenData = await getTokenData(contract);
      const dexData = await getDexData(contract);

      const marketCapValue = parseFloat(tokenData.totalSupply) * parseFloat(dexData.priceUsd);

      const totalSupplyAbrev = abreviarNumero(tokenData.totalSupply);
      const liquidityAbrev = abreviarNumero(dexData.liquidity);
      const marketCapAbrev = abreviarNumero(marketCapValue);

      const msg1 = `
Nombre: ${tokenData.name}
Símbolo: ${tokenData.symbol}
Total Supply: ${totalSupplyAbrev}
Liquidez: ${liquidityAbrev} USD
Precio: ${dexData.priceUsd} USD
Market Cap: ${marketCapAbrev} USD
`;

      const msg2 = `Contract Address: ${contract}`;

      await axios.post(
        WHATSAPP_API,
        {
          messaging_product: "whatsapp",
          to: chatId,
          text: { body: msg1 }
        },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      await axios.post(
        WHATSAPP_API,
        {
          messaging_product: "whatsapp",
          to: chatId,
          text: { body: msg2 }
        },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

    } catch (e) {
      console.error(e);
    }
  }

  res.sendStatus(200);
});

// Agrega al final del archivo, antes de cerrar:
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
