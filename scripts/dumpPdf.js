const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = '../BANCO-TERMINOLOGICO-SERIES-Y-SUBSERIES-DOCUMENTALES_BANTER_V4.pdf';

let dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('banter_text_dump.txt', data.text);
    console.log('PDF text extracted to banter_text_dump.txt');
}).catch(err => console.error(err));
