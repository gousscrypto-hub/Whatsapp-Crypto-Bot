import express from 'express';
import axios from 'axios';
import { ethers } from 'ethers';

const app = express();
app.use(express.json());

// Variables entorno: asegúrate de setearlas en Render
const WHATSAPP_API = "https://graph.facebook.com/v15.0/your_phone_number_id/messages"; // Cambia this por tu ID correcto
const TOKEN = process.env.WHATSAPP_TOKEN;
const RPC_URL = process.env.RPC_URL;

// Función para abreviar números grandes
function abreviarNumero(num) {
  num = Number(num);
  if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toString();
}

// Consulta token directamente en blockchain
async function getTokenData(contractAddress) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const abi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)"
  ];
  const contract = new ethers.Contract(contractAddress, abi, provider);
  const name = await contract.name();
  const symbol = await contract.symbol();
  const totalSupplyRaw = await contract.totalSupply();
  const totalSupply = Number(ethers.formatUnits(totalSupplyRaw, 18)); // Ajusta decimales si necesario
  return { name, symbol, totalSupply };
}

// Consulta Dexscreener para precio y liquidez
async function getDexData(contractAddress) {
  const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`);
  const data = response.data.pairs[0];
  const priceUsd = parseFloat(data.priceUsd);
  const liquidity = parseFloat(data.liquidityUsd);
  return { priceUsd, liquidity };
}

// Endpoint webhook WhatsApp
app.post("/webhook", async (req, res) => {
  const body = req.body;
  const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0] || null;

  if (message && message.text) {
    const chatId = message.from;
    const contract = message.text.body.trim();

    try {
      const tokenData = await getTokenData(contract);
      const dexData = await getDexData(contract);
      const marketCapValue = tokenData.totalSupply * dexData.priceUsd;

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
`.trim();

      const msg2 = `Contract Address: ${contract}`;

      await axios.post(
        WHATSAPP_API,
        { messaging_product: "whatsapp", to: chatId, text: { body: msg1 } },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      await axios.post(
        WHATSAPP_API,
        { messaging_product: "whatsapp", to: chatId, text: { body: msg2 } },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

    } catch (e) {
      console.error("Error procesando mensaje:", e);
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
