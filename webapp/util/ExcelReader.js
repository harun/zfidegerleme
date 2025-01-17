sap.ui.define([], function () {
    "use strict";

    return {
        parseExcel: function (file, callback) {
            const reader = new FileReader();

            reader.onload = function (e) {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });

                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                callback(jsonData);
            };

            reader.readAsBinaryString(file);
        }
    };
});
