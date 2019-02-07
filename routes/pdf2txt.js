var async = require("async");

let fs = require("fs"),
  PDFParser = require("pdf2json");

module.exports = {
  transform: async function(callback) {
    return new Promise((resolve, reject) => {
      let pdfParser = new PDFParser(this, 1);

      pdfParser.on("pdfParser_dataError", errData =>
        console.error(errData.parserError)
      );

      pdfParser.on("pdfParser_dataReady", pdfData => {
        fs.writeFile("public/r102826.txt", pdfParser.getRawTextContent());
        resolve(pdfParser.getRawTextContent());
      });

      pdfParser.loadPDF("public/r102826.pdf");
    });
  }
}