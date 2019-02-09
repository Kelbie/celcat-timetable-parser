var async = require("async");

let fs = require("fs"),
  PDFParser = require("pdf2json");

module.exports = {
  transform: async function(file) {
    return new Promise((resolve, reject) => {
      let pdfParser = new PDFParser(this, 1);

      pdfParser.on("pdfParser_dataError", errData =>
        console.error(0, errData.parserError)
      );

      pdfParser.on("pdfParser_dataReady", pdfData => {
        // fs.writeFile(`${file}`, pdfParser.getRawTextContent());
        resolve(pdfParser.getRawTextContent());
      });

      pdfParser.loadPDF(`timetables/${file}`);
    });
  }
}