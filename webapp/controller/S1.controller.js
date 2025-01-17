sap.ui.define([
    'com/zfidegerleme/controller/BaseController',
    "com/zfidegerleme/util/ExcelReader",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/DateFormat"
], (BaseController, ExcelReader, JSONModel, DateFormat) => {
    "use strict";

    return BaseController.extend("com.zfidegerleme.controller.S1", {
        onInit() {
        },

        onFileChange: function (oEvent) {

            const oFileUploader = oEvent.getSource();
            const aFiles = oEvent.getParameter("files");

            if (aFiles && aFiles.length > 0) {
                const file = aFiles[0];
                const sFileName = file.name;
                const aValidExtensions = ["xlsx", "xls"];
                const sFileExtension = sFileName.split(".").pop().toLowerCase();

                if (!aValidExtensions.includes(sFileExtension)) {
                    sap.m.MessageToast.show("Lütfen geçerli bir Excel dosyası (.xlsx, .xls) yükleyin!");
                    return;
                }

                const reader = new FileReader();

                reader.onload = (e) => {

                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: "array" });

                    // Sayfaların kontrolü
                    const requiredSheets = ["items", "ledger", "header"];
                    const missingSheets = requiredSheets.filter(sheetName => !workbook.Sheets[sheetName]);

                    if (missingSheets.length > 0) {
                        sap.m.MessageToast.show("Eksik sayfalar: " + missingSheets.join(", "));
                        return;
                    }

                    const parseExcelDate = (excelDate) => {
                        // Excel tarihlerini dönüştürmek için 1 Ocak 1900'dan itibaren gün sayısını ekliyoruz
                        const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Excel başlangıç tarihi
                        return new Date(excelEpoch.getTime() + excelDate * 86400000); // Günleri milisaniyeye çevir
                    };

                    // Tarih olarak işlenecek kolon adları
                    const dateFields = ["DocumentDate", "PostingDate", "AssetValueDate"];

                    // Genel fonksiyon: Sheet verisini JSON'a çevirir, boş satırları dahil etmez
                    const parseSheetData = (sheetName, targetPath) => {
                        const sheet = workbook.Sheets[sheetName];
                        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                        if (sheetName === "header") {
                            const headerObj = {};
                            jsonData.forEach(row => {
                                if (row[0] && row[1]) { // Boş hücreleri almaz
                                    if (dateFields.includes(row[0]) && typeof row[1] === "number") {
                                        headerObj[row[0]] = parseExcelDate(row[1]).toISOString().slice(0, 10); // "YYYY-MM-DD" formatı
                                    } else {
                                        headerObj[row[0]] = row[1];
                                    }
                                }
                            });
                            this.getModel("ui").setProperty(targetPath, headerObj);
                        } else {
                            const arrayData = jsonData.slice(1).filter(row => {
                                // Tüm hücrelerin boş olup olmadığını kontrol et
                                return row.some(cell => cell !== undefined && cell !== null && cell.toString().trim() !== "");
                            }).map(row => {
                                const obj = {};
                                jsonData[0].forEach((key, index) => {
                                    let cellValue = row[index];
                                    // Eğer alan ismi tarih alanlarından biri ise dönüşüm yap
                                    if (dateFields.includes(key) && typeof cellValue === "number") {
                                        cellValue = parseExcelDate(cellValue).toISOString().slice(0, 10); // "YYYY-MM-DD" formatı
                                    }
                                    obj[key] = cellValue !== undefined ? cellValue : null;
                                });
                                return obj;
                            });
                            this.getModel("ui").setProperty(targetPath, arrayData);
                        }
                    };



                    // Sheets'i işle
                    parseSheetData("items", "/items");
                    parseSheetData("ledger", "/ledger");
                    parseSheetData("header", "/header");

                    sap.m.MessageToast.show("Veriler başarıyla yüklendi!");
                };

                reader.readAsArrayBuffer(file);
            } else {
                sap.m.MessageToast.show("Lütfen bir dosya seçin!");
            }
        },

        formatDate: function (sDate) {
            var oDateFormat = DateFormat.getInstance({ pattern: "dd/MM/yyyy" });
            return oDateFormat.format(new Date(sDate));
        },


        onPressKaydetx: async function (oEvent) {
            debugger;

            const items = this.getModel("ui").getProperty("/items") || [];
            const header = this.getModel("ui").getProperty("/header") || {};
            const ledger = this.getModel("ui").getProperty("/ledger") || [];


            const bo = this.getModel("bo").getData();


            if (!items.length || !Object.keys(header).length || !ledger.length) {
                sap.m.MessageToast.show("Kaydedilecek veri bulunamadı!");
                return;
            }


            const oEntry = {
                ...header,
                _ItemAmount: items.map(item => ({ ...item })),
                _Ledger: ledger.map(ledgerItem => ({
                    Ledger: ledgerItem.Ledger,
                    _Valuation: [
                        {
                            AssetDepreciationArea: ledgerItem.AssetDepreciationArea // 
                        }
                    ]
                }))
            };

            Object.keys(bo.header || {}).forEach(key => {
                if (!oEntry.hasOwnProperty(key)) {
                    oEntry[key] = bo.header[key];
                }
            });

            Object.keys(bo).forEach(key => {
                if (!oEntry.hasOwnProperty(key)) {
                    oEntry[key] = bo[key];
                }
            });

            oEntry._ItemAmount = items.map(item => {
                const newItem = { ...item }; // Mevcut item verisini al
                Object.keys(bo.item || {}).forEach(key => {
                    if (!newItem.hasOwnProperty(key)) {
                        newItem[key] = bo.item[key]; // Eksik olan alanı bo.item'dan ekle
                    }
                });
                return newItem;
            });

            delete oEntry.header;
            delete oEntry.item;

            debugger;
            sap.ui.core.BusyIndicator.show();
            try {
                await this.postData(oEntry); // POST işlemini gerçekleştir
            } catch (oError) {
                console.error("Hata:", oError);
            } finally {
                sap.ui.core.BusyIndicator.hide(); // İşlem bittiğinde indikatörü kapat
            }

        },



        getData: function () {


            const data = {
                ReferenceDocumentItem: "000001",
                BusinessTransactionType: "REVA",
                CompanyCode: "1000",
                MasterFixedAsset: "A00012345678",
                FixedAsset: "0001",
                DocumentDate: "2023-12-01",
                PostingDate: "2023-12-02",
                AssetValueDate: "2023-12-03",
                DebitCreditCode: "D",
                FixedAssetYearOfAcqnCode: "C",
                DocumentReferenceID: "REF987654321",
                AccountingDocumentHeaderText: "Revaluation Document",
                FxdAstRevalAcqnAmtInFC: 15000.0,
                FxdAstRevalCYrDeprAmtInFC: 500.0,
                FxdAstRevalPrYrDeprAmtInFC: 300.0,
                FxdAstRevalFuncnlCrcy: "USD",
                AccountingDocumentType: "KR",
                AssignmentReference: "ASSIGN12345",
                DocumentItemText: "Asset revaluation example",
                _ItemAmount: [
                    {
                        AssetDepreciationArea: "01",
                        SubLedgerAcctLineItemType: "TYPE1",
                        TransactionCurrency: "USD",
                        CompanyCodeCurrency: "EUR",
                        GlobalCurrency: "GBP",
                        FreeDefinedCurrency1: "JPY",
                        FreeDefinedCurrency2: "AUD",
                        FreeDefinedCurrency3: "CAD",
                        FreeDefinedCurrency4: "CHF",
                        FreeDefinedCurrency5: "CNY",
                        FreeDefinedCurrency6: "INR",
                        FreeDefinedCurrency7: "MXN",
                        FreeDefinedCurrency8: "BRL",
                        AmountInTransactionCurrency: 12000.0,
                        AmountInCompanyCodeCurrency: 11500.0,
                        AmountInGlobalCurrency: 11000.0,
                        AmountInFreeDefinedCurrency1: 1500000.0,
                        AmountInFreeDefinedCurrency2: 12000.0,
                        AmountInFreeDefinedCurrency3: 11500.0,
                        AmountInFreeDefinedCurrency4: 11000.0,
                        AmountInFreeDefinedCurrency5: 10800.0,
                        AmountInFreeDefinedCurrency6: 10500.0,
                        AmountInFreeDefinedCurrency7: 10200.0,
                        AmountInFreeDefinedCurrency8: 10000.0,
                    },
                ],
                _Ledger: [
                    {
                        Ledger: "0L",
                        _Valuation: [
                            {
                                AssetDepreciationArea: "01",
                            },
                        ],
                    },
                ],
            };

            return data;

        },

        postData: async function (oEntry) {

            oEntry = this.getData();
            const oModel = this.getModel("fixedassetrevaluation");
            const sPath = "FixedAssetRevaluation/SAP__self.Post";

            // Kullanıcı adı ve şifreyi belirtin
            const username = "CPI_J4W_100";
            const password = "qapPKmCtjLhJFRfYmmFq%faHEzdRHyoGxhWynmv4";
            const basicAuth = "Basic " + btoa(username + ":" + password); // Basic Authentication için kullanıcı adı ve şifreyi kodlayın

            try {
                // CSRF Token al
                const csrfToken = await fetch(oModel.sServiceUrl + "/", {
                    method: "GET",
                    headers: {
                        "X-CSRF-Token": "Fetch"
                        //"Authorization": basicAuth // Authentication bilgileri
                    }

                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Token alma başarısız: ${response.statusText}`);
                        }
                        return response.headers.get("X-CSRF-Token");
                    });

                // POST işlemini gerçekleştir
                const response = await fetch(oModel.sServiceUrl + sPath, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-csrf-token": csrfToken,
                        "Authorization": basicAuth // Authentication bilgileri
                    },
                    body: JSON.stringify(oEntry),
                    //credentials: "include"
                });

                if (!response.ok) {
                    const errorResponse = await response.json();
                    throw new Error(`POST işlemi başarısız: ${errorResponse.error.message}`);
                }

                const data = await response.json();
                console.log("Başarılı:", data);
                sap.m.MessageToast.show("Kayıt başarılı!");
            } catch (error) {
                console.error("POST işlemi hatası:", error);
                sap.m.MessageBox.error(`Kayıt sırasında bir hata oluştu: ${error.message}`);
            }
        },

        onPressKaydet: function () {
            debugger;
            const oModel = this.getModel("fixedassetrevaluation"); // Manifest'ten alınan model
            const sServiceUrl = oModel.sServiceUrl; // Modelin temel URL'si
            const sPostUrl = `${sServiceUrl}/FixedAssetRevaluation/SAP__self.Post`; // POST işlemi için tam URL
        
            const sUsername = "CPI_J4W_100"; // Kullanıcı adınız
            const sPassword = "qapPKmCtjLhJFRfYmnFq%faHEzdRHy0GxhWynw4"; // Şifreniz
            const sAuth = btoa(`${sUsername}:${sPassword}`); // Basic Auth için encode
        
            // CSRF Token ve Cookie almak için GET isteği
            jQuery.ajax({
                url: sServiceUrl,
                method: "GET",
                headers: {
                    "X-CSRF-Token": "Fetch", // CSRF token talebi
                    Authorization: `Basic ${sAuth}` // Basic Auth başlığı
                },

                xhrFields: {
                    withCredentials: true
                },
                success: (data, textStatus, jqXHR) => {
                    const csrfToken = jqXHR.getResponseHeader("x-csrf-token"); // CSRF token
                    const allHeaders = jqXHR.getAllResponseHeaders(); // Tüm header'ları al
                    console.log("Headers:", allHeaders);
        
                    const sessionCookie = allHeaders
                        .split("\n")
                        .filter((line) => line.toLowerCase().startsWith("set-cookie"))
                        .map((line) => line.split(":")[1].trim().split(";")[0])
                        .join("; ");
        
                    console.log("CSRF Token Alındı:", csrfToken);
                    console.log("Cookie Alındı:", sessionCookie);
        
                    // POST işlemi için payload
                    const oPayload = {
                        ReferenceDocumentItem: "000001",
                        BusinessTransactionType: "REVA",
                        CompanyCode: "1000",
                        MasterFixedAsset: "A00012345678",
                        FixedAsset: "0001",
                        DocumentDate: "2023-12-01",
                        PostingDate: "2023-12-02",
                        AssetValueDate: "2023-12-03",
                        DebitCreditCode: "D",
                        FixedAssetYearOfAcqnCode: "C",
                        DocumentReferenceID: "REF987654321",
                        AccountingDocumentHeaderText: "Revaluation Document",
                        FxdAstRevalAcqnAmtInFC: 15000.0,
                        FxdAstRevalCYrDeprAmtInFC: 500.0,
                        FxdAstRevalPrYrDeprAmtInFC: 300.0,
                        FxdAstRevalFuncnlCrcy: "USD",
                        AccountingDocumentType: "KR",
                        AssignmentReference: "ASSIGN12345",
                        DocumentItemText: "Asset revaluation example",
                        _ItemAmount: [
                            {
                                AssetDepreciationArea: "01",
                                TransactionCurrency: "USD",
                                AmountInTransactionCurrency: 12000.0
                            }
                        ],
                        _Ledger: [
                            {
                                Ledger: "0L",
                                _Valuation: [{ AssetDepreciationArea: "01" }]
                            }
                        ]
                    };
        
                    // POST isteği
                    jQuery.ajax({
                        url: sPostUrl,
                        method: "POST",
                        contentType: "application/json",
                        headers: {
                            "X-CSRF-Token": csrfToken,
                            Authorization: `Basic ${sAuth}`, // Basic Auth başlığı
                            Cookie: sessionCookie // Cookie bilgisi ekleniyor
                        },
                        data: JSON.stringify(oPayload),
                        success: (data) => {
                            console.log("POST işlemi başarılı! Dönen veri:", data);
                            sap.m.MessageToast.show("Kayıt başarılı!");
                        },
                        error: (error) => {
                            console.error("POST işlemi sırasında hata:", error);
                            sap.m.MessageBox.error("POST işlemi sırasında bir hata oluştu.");
                        }
                    });
                },
                error: (error) => {
                    console.error("CSRF Token alma sırasında hata:", error);
                }
            });
        }
        
        
        

















    });
});