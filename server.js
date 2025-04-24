const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { fromPath } = require('pdf2pic');
const Tesseract = require('tesseract.js');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static(__dirname));

app.post('/processar', upload.single('pdf'), async (req, res) => {
  try {
    const outputPath = 'output';
    const converter = fromPath(req.file.path, {
      density: 200,
      saveFilename: 'page',
      savePath: outputPath,
      format: 'png',
      width: 1000,
      height: 1400
    });

    const result = await converter(1);
    const imagePath = result.path;

    const { data: { text } } = await Tesseract.recognize(imagePath, 'por');
    const limpa = text.replace(/\s+/g, ' ').toUpperCase();

    const buscar = (label, regex) => {
      const match = limpa.match(regex);
      return match ? match[1] : "___";
    };

    const hemacias = buscar("Hemácias", /HEM[ÁA]CIAS[^0-9]*([0-9]+[.,]?[0-9]*)/i);
    const hb = buscar("Hemoglobina", /HEMOGLOBINA[^0-9]*([0-9]+[.,]?[0-9]*)/i);
    const ht = buscar("Hematócrito", /HEMAT[ÓO]CRITO[^0-9]*([0-9]+[.,]?[0-9]*)/i);
    const leuco = buscar("Leucócitos", /LEU[ÇC]OCITOS[^0-9]*([0-9.]+)/i);

    const spRaw = limpa.match(/PLAQUETAS[^0-9]*([0-9]{4,6})/i);
    const spNumber = spRaw ? parseInt(spRaw[1]) : 0;
    const sp = spNumber >= 20000 ? `${Math.round(spNumber / 1000)} x 10³` : "___";

    const resultado = `EXAMES LABORATORIAIS (//___):
- HMG: Normal (Hemácias: ${hemacias} / Hb: ${hb} / Ht: ${ht} / ...)
- Leucócitos: ${leuco}
- SP: ${sp}`;

    fs.unlinkSync(req.file.path);
    fs.unlinkSync(imagePath);
    res.json({ resultado });
  } catch (e) {
    console.error(e);
    res.json({ resultado: 'Erro ao processar o PDF.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor iniciado na porta', PORT));