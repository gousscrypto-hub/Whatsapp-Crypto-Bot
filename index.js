function abreviarNumero(num) {
  num = Number(num);
  if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toString();
}

app.post("/webhook", async (req, res) => {
  const body = req.body;
  const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0] || null;

  if (message && message.text) {
    const chatId = message.from;
    const contract = message.text.body.trim();

    try {
      const tokenData = await getTokenData(contract);
      const dexData = await getDexData(contract);

      // Calcula el market cap
      const marketCapValue = parseFloat(tokenData.totalSupply) * parseFloat(dexData.priceUsd);

      // Abrevia valores
      const totalSupplyAbrev = abreviarNumero(tokenData.totalSupply);
      const liquidityAbrev = abreviarNumero(dexData.liquidity);
      const marketCapAbrev = abreviarNumero(marketCapValue);

      // Primer mensaje
      const msg1 = `
Nombre: ${tokenData.name}
Símbolo: ${tokenData.symbol}
Total Supply: ${totalSupplyAbrev}
Liquidez: ${liquidityAbrev} USD
Precio: ${dexData.priceUsd} USD
Market Cap: ${marketCapAbrev} USD
`;

      // Segundo mensaje
      const msg2 = `Contract Address: ${contract}`;

      // Envía primer mensaje
      await axios.post(
        WHATSAPP_API,
        {
          messaging_product: "whatsapp",
          to: chatId,
          text: { body: msg1 }
        },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      // Envía segundo mensaje
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
